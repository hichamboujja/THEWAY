const express = require('express');
const crypto = require('crypto');
const { Issuer, generators } = require('openid-client');
const config = require('../lib/config');
const { ok, created, fail, httpError, asyncRoute, methodNotAllowed } = require('../lib/response');
const { hashPassword, verifyPassword } = require('../lib/passwords');
const { requireAuth, requireAdmin, issueCsrfToken } = require('../middleware/auth');
const { dbRateLimit } = require('../middleware/rateLimit');
const { sendEmail, passwordResetEmail } = require('../services/emailService');
const storage = require('../services/storageService');
const cvText = require('../services/cvTextService');
const ai = require('../services/aiService');
const { audit } = require('../services/auditService');

module.exports = function createProductionRouter(deps) {
    const router = express.Router();
    const { getConnection, upload } = deps;
    const rate = {
        auth: dbRateLimit(getConnection, 'auth', config.rateLimits.auth),
        reset: dbRateLimit(getConnection, 'password-reset', config.rateLimits.reset),
        upload: dbRateLimit(getConnection, 'upload', config.rateLimits.upload),
        ai: dbRateLimit(getConnection, 'ai', config.rateLimits.ai),
        admin: dbRateLimit(getConnection, 'admin', config.rateLimits.admin)
    };

    router.get('/api/auth/session', asyncRoute(async (req, res) => {
        ok(res, {
            user: req.currentUser || null,
            csrfToken: issueCsrfToken(req),
            authenticated: Boolean(req.currentUser)
        });
    }));

    router.post(['/api/auth/register', '/auth/register'], rate.auth, asyncRoute(async (req, res) => {
        const body = req.body || {};
        const email = normaliseEmail(body.email);
        assertEmail(email);
        assertPassword(body.password);
        const user = await createUser(getConnection, {
            nom: requiredText(body.nom || body.lastName || splitName(body.fullname).nom, 'Last name'),
            prenom: requiredText(body.prenom || body.firstName || splitName(body.fullname).prenom, 'First name'),
            email,
            password: body.password,
            telephone: cleanNullable(body.telephone || body.phone),
            localisation: cleanNullable(body.localisation || body.location),
            role: 'user'
        });
        await establishSession(req, user);
        await audit(getConnection, req, 'auth.register', 'utilisateur', user.id_user, { email });
        created(res, {
            message: 'Account created successfully',
            user: publicUser(user, ['user'], []),
            csrfToken: req.session.csrfToken
        });
    }));

    router.post(['/api/auth/login', '/auth/login'], rate.auth, asyncRoute(async (req, res) => {
        const email = normaliseEmail(req.body && req.body.email);
        const password = req.body && req.body.password;
        const user = await findUserByEmail(getConnection, email);
        if (!user || !(await verifyPassword(user.password, password))) {
            throw httpError(401, 'invalid_credentials', 'Invalid email or password');
        }
        await establishSession(req, user);
        await audit(getConnection, req, 'auth.login', 'utilisateur', user.id_user, {});
        ok(res, {
            message: 'Login successful',
            user: publicUser(user, await roleCodesForUser(getConnection, user.id_user), []),
            csrfToken: req.session.csrfToken
        });
    }));

    router.post(['/api/auth/logout'], asyncRoute(async (req, res) => {
        const userId = req.userId || null;
        await destroySession(req);
        await audit(getConnection, req, 'auth.logout', 'utilisateur', userId, {});
        ok(res, { message: 'Logged out' });
    }));

    router.post(['/api/auth/password-reset/request', '/auth-password-recovery'], rate.reset, asyncRoute(async (req, res) => {
        const email = normaliseEmail(req.body && req.body.email);
        if (email) {
            const user = await findUserByEmail(getConnection, email);
            if (user) {
                const rawToken = crypto.randomBytes(32).toString('hex');
                const tokenHash = sha256(rawToken);
                await insertResetToken(getConnection, user.id_user, tokenHash, req);
                const resetUrl = `${config.clientBaseUrl.replace(/\/$/, '')}/view/authentification/login.html?resetToken=${rawToken}`;
                await sendEmail(getConnection, Object.assign(passwordResetEmail(email, resetUrl), { userId: user.id_user }));
                if (config.nodeEnv !== 'production') {
                    return ok(res, {
                        message: 'If the email exists, a reset link has been sent',
                        debugResetToken: rawToken
                    });
                }
            }
        }
        ok(res, { message: 'If the email exists, a reset link has been sent' });
    }));

    router.post('/api/auth/password-reset/confirm', rate.reset, asyncRoute(async (req, res) => {
        const token = requiredText(req.body && req.body.token, 'Reset token');
        assertPassword(req.body && req.body.password);
        const tokenHash = sha256(token);
        const connection = await getConnection();
        try {
            await connection.beginTransaction();
            const [tokens] = await connection.execute(
                `SELECT * FROM password_reset_tokens
                 WHERE token_hash = ? AND consumed_at IS NULL AND expires_at > UTC_TIMESTAMP()
                 LIMIT 1 FOR UPDATE`,
                [tokenHash]
            );
            if (!tokens.length) throw httpError(400, 'reset_token_invalid', 'Reset token is invalid or expired');
            const passwordHash = await hashPassword(req.body.password);
            await connection.execute('UPDATE utilisateur SET password = ? WHERE id_user = ?', [passwordHash, tokens[0].id_user]);
            await connection.execute('UPDATE password_reset_tokens SET consumed_at = UTC_TIMESTAMP() WHERE id_reset_token = ?', [tokens[0].id_reset_token]);
            await connection.execute('DELETE FROM auth_sessions WHERE id_user = ?', [tokens[0].id_user]);
            await connection.commit();
            ok(res, { message: 'Password has been reset' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }));

    router.get('/api/auth/oauth/:provider/start', rate.auth, asyncRoute(async (req, res) => {
        const provider = providerConfig(req.params.provider);
        const client = await oidcClient(provider, `${config.appBaseUrl}/api/auth/oauth/${provider.name}/callback`);
        const state = generators.state();
        const nonce = generators.nonce();
        req.session.oauth = { provider: provider.name, state, nonce };
        await saveSession(req);
        res.redirect(client.authorizationUrl({
            scope: 'openid email profile',
            state,
            nonce
        }));
    }));

    router.get('/api/auth/oauth/:provider/callback', rate.auth, asyncRoute(async (req, res) => {
        const provider = providerConfig(req.params.provider);
        const expected = req.session && req.session.oauth;
        if (!expected || expected.provider !== provider.name || expected.state !== req.query.state) {
            throw httpError(400, 'oauth_state_invalid', 'OAuth state is invalid');
        }
        const redirectUri = `${config.appBaseUrl}/api/auth/oauth/${provider.name}/callback`;
        const client = await oidcClient(provider, redirectUri);
        const params = client.callbackParams(req);
        const tokenSet = await client.callback(redirectUri, params, { state: expected.state, nonce: expected.nonce });
        const claims = tokenSet.claims();
        const userInfo = claims.email ? claims : await client.userinfo(tokenSet.access_token);
        const user = await findOrCreateOAuthUser(getConnection, provider.name, userInfo, tokenSet);
        await establishSession(req, user);
        req.session.oauth = null;
        await saveSession(req);
        res.redirect('/view/pannel/dashboard.html');
    }));

    router.get('/api/profile', requireAuth, asyncRoute(async (req, res) => {
        ok(res, { profile: req.currentUser });
    }));

    router.put('/api/profile', requireAuth, asyncRoute(async (req, res) => {
        const body = req.body || {};
        const nom = requiredText(body.nom, 'Last name');
        const prenom = requiredText(body.prenom, 'First name');
        const photo = sanitisePhoto(body.photo);
        await execute(getConnection,
            'UPDATE utilisateur SET nom = ?, prenom = ?, telephone = ?, localisation = ?, photo = ? WHERE id_user = ?',
            [nom, prenom, cleanNullable(body.telephone), cleanNullable(body.localisation), photo, req.userId]
        );
        await audit(getConnection, req, 'profile.update', 'utilisateur', req.userId, {});
        ok(res, { message: 'Profile updated' });
    }));

    router.put('/api/account/password', requireAuth, rate.auth, asyncRoute(async (req, res) => {
        assertPassword(req.body && req.body.newPassword);
        const user = await findUserById(getConnection, req.userId);
        if (!user || !(await verifyPassword(user.password, req.body.currentPassword))) {
            throw httpError(401, 'reauth_required', 'Current password is invalid');
        }
        await execute(getConnection, 'UPDATE utilisateur SET password = ? WHERE id_user = ?', [await hashPassword(req.body.newPassword), req.userId]);
        await execute(getConnection, 'DELETE FROM auth_sessions WHERE id_user = ? AND sid <> ?', [req.userId, req.sessionID]);
        await audit(getConnection, req, 'account.password_change', 'utilisateur', req.userId, {});
        ok(res, { message: 'Password updated' });
    }));

    router.put('/api/account/email', requireAuth, rate.auth, asyncRoute(async (req, res) => {
        const email = normaliseEmail(req.body && req.body.email);
        assertEmail(email);
        const user = await findUserById(getConnection, req.userId);
        if (!user || !(await verifyPassword(user.password, req.body.currentPassword))) {
            throw httpError(401, 'reauth_required', 'Current password is invalid');
        }
        await execute(getConnection, 'UPDATE utilisateur SET email = ? WHERE id_user = ?', [email, req.userId]);
        await audit(getConnection, req, 'account.email_change', 'utilisateur', req.userId, { email });
        ok(res, { message: 'Email updated' });
    }));

    router.get('/api/opportunities', asyncRoute(async (req, res) => {
        const result = await listOpportunities(getConnection, req);
        ok(res, result);
    }));

    router.get('/api/opportunities/:id', asyncRoute(async (req, res) => {
        const opportunity = await getOpportunity(getConnection, req.params.id);
        if (!opportunity) throw httpError(404, 'opportunity_not_found', 'Opportunity not found');
        ok(res, { opportunity });
    }));

    router.post(['/api/opportunities/:id/bookmark'], requireAuth, asyncRoute(async (req, res) => {
        const opportunity = await getOpportunity(getConnection, req.params.id);
        if (!opportunity) throw httpError(404, 'opportunity_not_found', 'Opportunity not found');
        await execute(
            getConnection,
            `INSERT IGNORE INTO saved_opportunity (id_saved, id_user, opportunity_id, opportunity_uid)
             VALUES (?, ?, ?, ?)`,
            [crypto.randomUUID(), req.userId, opportunity.id, opportunity.uid]
        );
        await audit(getConnection, req, 'opportunity.bookmark', 'opportunity', String(opportunity.id), {});
        ok(res, { saved: true, opportunityId: opportunity.id, message: 'Opportunity saved' });
    }));

    router.delete('/api/opportunities/:id/bookmark', requireAuth, asyncRoute(async (req, res) => {
        const opportunity = await getOpportunity(getConnection, req.params.id);
        if (!opportunity) throw httpError(404, 'opportunity_not_found', 'Opportunity not found');
        await execute(getConnection, 'DELETE FROM saved_opportunity WHERE id_user = ? AND opportunity_id = ?', [req.userId, opportunity.id]);
        await audit(getConnection, req, 'opportunity.unbookmark', 'opportunity', String(opportunity.id), {});
        ok(res, { saved: false, opportunityId: opportunity.id, message: 'Opportunity removed' });
    }));

    router.post('/opportunity-bookmark', requireAuth, asyncRoute(async (req, res) => {
        const id = req.body.opportunityId || req.body.id || req.body.uid;
        if (!id) throw httpError(400, 'opportunity_required', 'Opportunity id is required');
        req.params.id = id;
        if (req.body.saved === false) {
            const opportunity = await getOpportunity(getConnection, id);
            if (opportunity) await execute(getConnection, 'DELETE FROM saved_opportunity WHERE id_user = ? AND opportunity_id = ?', [req.userId, opportunity.id]);
            return ok(res, { saved: false, message: 'Opportunity removed' });
        }
        const opportunity = await getOpportunity(getConnection, id);
        if (!opportunity) throw httpError(404, 'opportunity_not_found', 'Opportunity not found');
        await execute(getConnection, 'INSERT IGNORE INTO saved_opportunity (id_saved, id_user, opportunity_id, opportunity_uid) VALUES (?, ?, ?, ?)', [crypto.randomUUID(), req.userId, opportunity.id, opportunity.uid]);
        ok(res, { saved: true, message: 'Opportunity saved' });
    }));

    router.post('/api/opportunities/:id/applications', requireAuth, asyncRoute(async (req, res) => {
        const opportunity = await getOpportunity(getConnection, req.params.id);
        if (!opportunity) throw httpError(404, 'opportunity_not_found', 'Opportunity not found');
        const id = crypto.randomUUID();
        await execute(
            getConnection,
            `INSERT INTO application (id_application, id_user, opportunity_id, cv_file_id, cover_message, status)
             VALUES (?, ?, ?, ?, ?, 'submitted')
             ON DUPLICATE KEY UPDATE cover_message = VALUES(cover_message), cv_file_id = VALUES(cv_file_id), updated_at = CURRENT_TIMESTAMP`,
            [id, req.userId, opportunity.id, cleanNullable(req.body.cvFileId), cleanNullable(req.body.coverMessage)]
        );
        await audit(getConnection, req, 'application.submit', 'opportunity', String(opportunity.id), {});
        created(res, { application: { id, opportunityId: opportunity.id, status: 'submitted' } });
    }));

    router.get('/api/skills', requireAuth, asyncRoute(async (req, res) => {
        const [skills] = await query(getConnection,
            `SELECT c.id_skill, c.nom, c.categorie, us.niveau, us.score
             FROM user_skill us
             JOIN competence c ON c.id_skill = us.id_skill
             WHERE us.id_user = ?
             ORDER BY c.nom ASC LIMIT 500`,
            [req.userId]
        );
        ok(res, { skills });
    }));

    router.post('/api/skills', requireAuth, asyncRoute(async (req, res) => {
        const name = requiredText(req.body && req.body.nom, 'Skill name');
        const category = cleanNullable(req.body && req.body.categorie);
        const level = cleanNullable(req.body && req.body.niveau);
        const score = clampInt(req.body && req.body.score, 0, 100, 0);
        const skill = await upsertSkill(getConnection, name, category);
        await execute(
            getConnection,
            `INSERT INTO user_skill (id_user_skill, id_user, id_skill, niveau, score)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE niveau = VALUES(niveau), score = VALUES(score)`,
            [crypto.randomUUID(), req.userId, skill.id_skill, level, score]
        );
        await audit(getConnection, req, 'skill.add', 'competence', skill.id_skill, {});
        created(res, { skill: toUserSkill(skill, level, score), message: 'Skill saved' });
    }));

    router.put('/api/skills/:id', requireAuth, asyncRoute(async (req, res) => {
        const [result] = await execute(
            getConnection,
            'UPDATE user_skill SET niveau = ?, score = ? WHERE id_user = ? AND id_skill = ?',
            [cleanNullable(req.body && req.body.niveau), clampInt(req.body && req.body.score, 0, 100, 0), req.userId, req.params.id]
        );
        if (!result.affectedRows) throw httpError(404, 'skill_not_found', 'Skill not found');
        const [rows] = await query(getConnection,
            `SELECT c.id_skill, c.nom, c.categorie, us.niveau, us.score
             FROM user_skill us
             JOIN competence c ON c.id_skill = us.id_skill
             WHERE us.id_user = ? AND us.id_skill = ?
             LIMIT 1`,
            [req.userId, req.params.id]
        );
        ok(res, { skill: rows[0] || null, message: 'Skill updated' });
    }));

    router.delete('/api/skills/:id', requireAuth, asyncRoute(async (req, res) => {
        const [result] = await execute(getConnection, 'DELETE FROM user_skill WHERE id_user = ? AND id_skill = ?', [req.userId, req.params.id]);
        if (!result.affectedRows) throw httpError(404, 'skill_not_found', 'Skill not found');
        ok(res, { message: 'Skill removed' });
    }));

    router.get('/api/objectives', requireAuth, asyncRoute(async (req, res) => {
        const [objectives] = await query(getConnection, 'SELECT * FROM objectif WHERE id_user = ? ORDER BY created_at DESC', [req.userId]);
        ok(res, { objectives });
    }));

    router.post('/api/objectives', requireAuth, asyncRoute(async (req, res) => {
        const id = crypto.randomUUID();
        await execute(
            getConnection,
            `INSERT INTO objectif (id_objectif, id_user, id_skill, id_offre, titre, progression, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                req.userId,
                cleanNullable(req.body.id_skill),
                cleanNullable(req.body.id_offre),
                requiredText(req.body.titre || req.body.name, 'Objective title'),
                clampInt(req.body.progression, 0, 100, 0),
                normaliseStatus(req.body.status, ['en_attente', 'en_cours', 'termine'], 'en_attente')
            ]
        );
        await audit(getConnection, req, 'objective.create', 'objectif', id, {});
        created(res, { objective: { id_objectif: id }, message: 'Objective created' });
    }));

    router.put('/api/objectives/:id', requireAuth, asyncRoute(async (req, res) => {
        const [result] = await execute(
            getConnection,
            'UPDATE objectif SET titre = COALESCE(?, titre), progression = ?, status = ? WHERE id_objectif = ? AND id_user = ?',
            [
                cleanNullable(req.body.titre),
                clampInt(req.body.progression, 0, 100, 0),
                normaliseStatus(req.body.status, ['en_attente', 'en_cours', 'termine'], 'en_cours'),
                req.params.id,
                req.userId
            ]
        );
        if (!result.affectedRows) throw httpError(404, 'objective_not_found', 'Objective not found');
        ok(res, { message: 'Objective updated' });
    }));

    router.delete('/api/objectives/:id', requireAuth, asyncRoute(async (req, res) => {
        await execute(getConnection, 'DELETE FROM objectif WHERE id_objectif = ? AND id_user = ?', [req.params.id, req.userId]);
        ok(res, { message: 'Objective deleted' });
    }));

    router.post('/api/files/presign', requireAuth, rate.upload, asyncRoute(async (req, res) => {
        created(res, await storage.createPresignedUpload(getConnection, req.userId, req.body || {}));
    }));

    router.post('/api/files/:id/content', requireAuth, rate.upload, upload.single('file'), asyncRoute(async (req, res) => {
        const file = await storage.storePendingUploadContent(getConnection, req.userId, req.params.id, req.file);
        ok(res, { file });
    }));

    router.post('/api/files/complete', requireAuth, rate.upload, asyncRoute(async (req, res) => {
        const file = await storage.completeUpload(getConnection, req.userId, requiredText(req.body.fileId, 'File id'), req.body);
        ok(res, { file });
    }));

    router.get('/api/files/:id', requireAuth, asyncRoute(async (req, res) => {
        const { file, buffer } = await storage.readFileBuffer(getConnection, req.userId, req.params.id, req.userRoles.includes('admin'));
        res.setHeader('Content-Type', file.mime_type);
        res.setHeader('Content-Disposition', `inline; filename="${file.original_name.replace(/"/g, '')}"`);
        res.send(buffer);
    }));

    router.delete('/api/files/:id/delete', requireAuth, asyncRoute(async (req, res) => {
        await storage.deleteFile(getConnection, req.userId, req.params.id, req.userRoles.includes('admin'));
        ok(res, { message: 'File deleted' });
    }));

    router.post('/file-export', requireAuth, asyncRoute(async (req, res) => {
        const kind = slug(req.body.kind || 'summary');
        if (['users', 'invoice'].includes(kind) && !req.userRoles.includes('admin')) {
            throw httpError(403, 'forbidden', 'Export not authorised');
        }
        const rows = await exportRows(getConnection, req, kind);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="theway-${kind}.csv"`);
        res.send(toCsv(rows));
    }));

    router.post(['/api/cv', '/file-upload'], requireAuth, rate.upload, upload.single('file'), asyncRoute(async (req, res) => {
        const file = await storage.storeUploadedFile(getConnection, req.userId, req.file, { type: 'cv' });
        const idCv = crypto.randomUUID();
        await execute(getConnection, 'INSERT INTO cv (id_cv, id_user, fichier) VALUES (?, ?, ?)', [idCv, req.userId, file.id]);
        await audit(getConnection, req, 'cv.upload', 'cv', idCv, { fileId: file.id });
        created(res, { cv: { id_cv: idCv, file }, file, message: 'CV uploaded' });
    }));

    router.get('/api/cv/current', requireAuth, asyncRoute(async (req, res) => {
        const [rows] = await query(
            getConnection,
            `SELECT cv.*, fa.original_name, fa.mime_type, fa.size_bytes, fa.status AS file_status
             FROM cv
             LEFT JOIN file_asset fa ON fa.id_file = cv.fichier
             WHERE cv.id_user = ?
             ORDER BY cv.date_upload DESC LIMIT 1`,
            [req.userId]
        );
        ok(res, { cv: rows[0] || null });
    }));

    router.post('/api/cv/:id/analyse', requireAuth, rate.ai, asyncRoute(async (req, res) => {
        const cv = await getOwnedCv(getConnection, req.userId, req.params.id);
        const { file, buffer } = await storage.readFileBuffer(getConnection, req.userId, cv.fichier, false);
        const text = await cvText.extractText(file, buffer);
        const analysis = await ai.analyseCvText(text);
        const id = crypto.randomUUID();
        await execute(
            getConnection,
            `INSERT INTO cv_analysis
             (id_analysis, id_cv, id_user, id_file, provider, model, prompt_version, provider_response_id, status,
              extracted_skills, summary, raw_response, started_at, completed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
            [
                id,
                cv.id_cv,
                req.userId,
                cv.fichier,
                config.ai.provider,
                config.ai.model,
                analysis.promptVersion,
                analysis.providerResponseId,
                JSON.stringify(analysis.extractedSkills),
                analysis.summary,
                JSON.stringify(analysis.raw)
            ]
        );
        const syncedSkills = await syncExtractedSkills(getConnection, req.userId, analysis.extractedSkills);
        await execute(getConnection, 'UPDATE cv SET scann_analyse = ? WHERE id_cv = ?', [analysis.summary, cv.id_cv]);
        await audit(getConnection, req, 'cv.analyse', 'cv', cv.id_cv, { analysisId: id, syncedSkills: syncedSkills.length });
        created(res, { analysis: Object.assign({ id_analysis: id, syncedSkills }, analysis) });
    }));

    router.post('/api/matching/run', requireAuth, rate.ai, asyncRoute(async (req, res) => {
        const idempotencyKey = cleanNullable(req.headers['idempotency-key'] || req.body.idempotencyKey) || crypto.randomUUID();
        const existing = await findMatchingRunByKey(getConnection, req.userId, idempotencyKey);
        if (existing) return ok(res, { run: existing, idempotent: true });

        const cv = await latestCv(getConnection, req.userId);
        const analysis = cv ? await latestCvAnalysis(getConnection, req.userId, cv.id_cv) : null;
        const skills = analysis ? safeJson(analysis.extracted_skills, []) : await userSkillNames(getConnection, req.userId);
        const opportunities = await listMatchingOpportunities(getConnection, skills);
        const ranked = await ai.rankOpportunities({
            skills,
            summary: analysis && analysis.summary || '',
            opportunities
        });
        const runId = crypto.randomUUID();
        await execute(
            getConnection,
            `INSERT INTO matching_run
             (id_matching_run, id_user, id_cv, provider, model, prompt_version, idempotency_key, status, completed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', UTC_TIMESTAMP())`,
            [runId, req.userId, cv && cv.id_cv || null, config.ai.provider, config.ai.model, ranked.promptVersion, idempotencyKey]
        );
        for (const item of ranked.matches) {
            await execute(
                getConnection,
                `INSERT INTO matching_result
                 (id_matching_result, id_matching_run, id_user, opportunity_id, score, matched_skills, missing_skills, explanation, provider_response_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    crypto.randomUUID(),
                    runId,
                    req.userId,
                    item.opportunityId,
                    clampInt(item.score, 0, 100, 0),
                    JSON.stringify(item.matchedSkills || []),
                    JSON.stringify(item.missingSkills || []),
                    cleanNullable(item.explanation),
                    ranked.providerResponseId
                ]
            );
        }
        await audit(getConnection, req, 'matching.run', 'matching_run', runId, { count: ranked.matches.length });
        created(res, { run: { id_matching_run: runId, status: 'completed' }, matches: ranked.matches });
    }));

    router.get('/api/matching', requireAuth, asyncRoute(async (req, res) => {
        const limit = clampInt(req.query.limit, 1, 50, 10);
        const page = clampInt(req.query.page, 1, 100000, 1);
        const offset = (page - 1) * limit;
        const latestRunSql = `SELECT id_matching_run
                FROM matching_run
                WHERE id_user = ?
                ORDER BY completed_at DESC, created_at DESC
                LIMIT 1`;
        const [[count]] = await query(
            getConnection,
            `SELECT COUNT(*) AS total
             FROM matching_result mr
             JOIN (${latestRunSql}) latest ON latest.id_matching_run = mr.id_matching_run
             WHERE mr.id_user = ?`,
            [req.userId, req.userId]
        );
        const [matches] = await query(
            getConnection,
            `SELECT mr.*, o.title, o.company, o.location, o.skills
             FROM matching_result mr
             JOIN (${latestRunSql}) latest ON latest.id_matching_run = mr.id_matching_run
             LEFT JOIN opportunities o ON o.id = mr.opportunity_id
             WHERE mr.id_user = ?
             ORDER BY mr.created_at DESC, mr.score DESC
             LIMIT ? OFFSET ?`,
            [req.userId, req.userId, limit, offset]
        );
        ok(res, { matches: matches.map(row => Object.assign(row, {
            matched_skills: safeJson(row.matched_skills, []),
            missing_skills: safeJson(row.missing_skills, []),
            skills: parseSkills(row.skills)
        })), pagination: { page, limit, total: Number(count.total) || 0 } });
    }));

    router.get('/api/matching/:id', requireAuth, asyncRoute(async (req, res) => {
        const [rows] = await query(getConnection, 'SELECT * FROM matching_result WHERE id_matching_result = ? AND id_user = ?', [req.params.id, req.userId]);
        if (!rows.length) throw httpError(404, 'matching_not_found', 'Matching result not found');
        ok(res, { match: rows[0] });
    }));

    router.get('/api/settings/user', requireAuth, asyncRoute(async (req, res) => {
        const [rows] = await query(getConnection, 'SELECT setting_key, value_json FROM user_setting WHERE id_user = ?', [req.userId]);
        ok(res, { settings: objectFromSettings(rows) });
    }));

    router.put('/api/settings/user', requireAuth, asyncRoute(async (req, res) => {
        for (const [key, value] of Object.entries(req.body || {})) {
            await execute(
                getConnection,
                `INSERT INTO user_setting (id_user, setting_key, value_json)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = CURRENT_TIMESTAMP`,
                [req.userId, key, JSON.stringify(value)]
            );
        }
        ok(res, { message: 'Settings updated' });
    }));

    router.get('/api/settings/public/:key', asyncRoute(async (req, res) => {
        const [rows] = await query(getConnection, 'SELECT value_json FROM app_setting WHERE setting_key = ? AND is_public = TRUE LIMIT 1', [req.params.key]);
        ok(res, rows.length ? safeJson(rows[0].value_json, {}) : {});
    }));

    router.get('/api/notifications', requireAuth, asyncRoute(async (req, res) => {
        const [notifications] = await query(
            getConnection,
            `SELECT n.*
             FROM user_notification un
             JOIN notification n ON n.id_notification = un.id_notification
             WHERE un.id_user = ?
             ORDER BY n.date_notification DESC LIMIT ?`,
            [req.userId, clampInt(req.query.limit, 1, 50, 20)]
        );
        ok(res, { notifications });
    }));

    router.put('/api/notifications/:id', requireAuth, asyncRoute(async (req, res) => {
        await execute(
            getConnection,
            `UPDATE notification n
             JOIN user_notification un ON un.id_notification = n.id_notification
             SET n.lu = ?
             WHERE n.id_notification = ? AND un.id_user = ?`,
            [Boolean(req.body.lu), req.params.id, req.userId]
        );
        ok(res, { message: 'Notification updated' });
    }));

    router.get('/api/support/tickets', requireAuth, asyncRoute(async (req, res) => {
        const isAdmin = req.userRoles.includes('admin');
        const [tickets] = await query(
            getConnection,
            `SELECT st.*, u.email
             FROM support_ticket st
             LEFT JOIN utilisateur u ON u.id_user = st.id_user
             ${isAdmin ? '' : 'WHERE st.id_user = ?'}
             ORDER BY st.updated_at DESC LIMIT ?`,
            isAdmin ? [clampInt(req.query.limit, 1, 100, 50)] : [req.userId, clampInt(req.query.limit, 1, 100, 50)]
        );
        ok(res, { tickets });
    }));

    router.post('/api/support/tickets', requireAuth, asyncRoute(async (req, res) => {
        const id = crypto.randomUUID();
        await execute(
            getConnection,
            `INSERT INTO support_ticket (id_ticket, id_user, subject, message, status, priority)
             VALUES (?, ?, ?, ?, 'open', ?)`,
            [id, req.userId, requiredText(req.body.subject || req.body.label || req.body.name, 'Subject'), cleanNullable(req.body.message), normaliseStatus(req.body.priority, ['low', 'normal', 'high'], 'normal')]
        );
        created(res, { ticket: { id_ticket: id }, message: 'Support ticket created' });
    }));

    router.post('/api/billing/upgrade-request', requireAuth, asyncRoute(async (req, res) => {
        const id = crypto.randomUUID();
        await execute(
            getConnection,
            'INSERT INTO upgrade_request (id_upgrade_request, id_user, requested_plan_code, message) VALUES (?, ?, ?, ?)',
            [id, req.userId, cleanNullable(req.body.plan || req.body.planCode), cleanNullable(req.body.message)]
        );
        await execute(
            getConnection,
            `INSERT INTO support_ticket (id_ticket, id_user, subject, message, status, priority)
             VALUES (?, ?, 'Plan upgrade request', ?, 'open', 'normal')`,
            [crypto.randomUUID(), req.userId, cleanNullable(req.body.message || `Requested plan: ${req.body.plan || 'premium'}`)]
        );
        created(res, { upgradeRequest: { id_upgrade_request: id, status: 'open' }, message: 'Upgrade request sent' });
    }));

    router.get('/api/plans', asyncRoute(async (req, res) => {
        const [plans] = await query(getConnection, 'SELECT * FROM plan_catalogue WHERE active = TRUE ORDER BY monthly_price ASC', []);
        ok(res, { plans: plans.map(row => Object.assign(row, { features: safeJson(row.features, []) })) });
    }));

    router.post('/draft-create', requireAuth, asyncRoute(async (req, res) => {
        const page = String(req.body.page || '');
        if (page.includes('skills')) {
            const skill = await upsertSkill(getConnection, req.body.name || req.body.label || 'Nouvelle competence', null);
            await execute(getConnection, 'INSERT IGNORE INTO user_skill (id_user_skill, id_user, id_skill) VALUES (?, ?, ?)', [crypto.randomUUID(), req.userId, skill.id_skill]);
            return created(res, { skill, message: 'Skill created' });
        }
        if (page.includes('progression') || page.includes('objectif')) {
            const id = crypto.randomUUID();
            await execute(getConnection, 'INSERT INTO objectif (id_objectif, id_user, titre, status) VALUES (?, ?, ?, ?)', [id, req.userId, req.body.name || 'Nouvel objectif', 'en_attente']);
            return created(res, { objective: { id_objectif: id }, message: 'Objective created' });
        }
        const id = crypto.randomUUID();
        await execute(getConnection, 'INSERT INTO support_ticket (id_ticket, id_user, subject, message, status, priority) VALUES (?, ?, ?, ?, ?, ?)', [id, req.userId, req.body.name || 'Action request', page, 'open', 'normal']);
        created(res, { ticket: { id_ticket: id }, message: 'Request created' });
    }));

    router.post('/entity-update', requireAuth, asyncRoute(async (req, res) => {
        await audit(getConnection, req, 'entity.update_request', 'ui_action', req.body.label || null, { page: req.body.page || null });
        ok(res, { message: 'Update request recorded' });
    }));

    router.post('/entity-delete', requireAuth, asyncRoute(async (req, res) => {
        await audit(getConnection, req, 'entity.delete_request', 'ui_action', req.body.label || null, { page: req.body.page || null });
        ok(res, { message: 'Delete request recorded' });
    }));

    router.post('/process-run', requireAuth, asyncRoute(async (req, res) => {
        await audit(getConnection, req, 'process.run', 'ui_action', req.body.action || null, { page: req.body.page || null, label: req.body.label || null });
        ok(res, { status: 'completed', message: 'Process completed' });
    }));

    router.post('/integration-connect', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
        await setAppSetting(getConnection, `integration.${slug(req.body.label || req.body.provider)}.enabled`, true, req.userId);
        ok(res, { connected: true, message: 'Integration enabled' });
    }));

    router.post('/integration-disconnect', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
        await setAppSetting(getConnection, `integration.${slug(req.body.label || req.body.provider)}.enabled`, false, req.userId);
        ok(res, { disconnected: true, message: 'Integration disabled' });
    }));

    router.post('/integration-update', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
        await setAppSetting(getConnection, `integration.${slug(req.body.label || req.body.provider)}.updated_at`, new Date().toISOString(), req.userId);
        ok(res, { updated: true, message: 'Integration updated' });
    }));

    router.get('/api/panel/summary', asyncRoute(async (req, res) => {
        const [[opportunities]] = await query(getConnection, 'SELECT COUNT(*) AS total, COUNT(DISTINCT NULLIF(company, "")) AS companies FROM opportunities', []);
        const [[users]] = await query(getConnection, 'SELECT COUNT(*) AS total FROM utilisateur', []);
        const [[skills]] = await query(getConnection, 'SELECT COUNT(*) AS total FROM competence', []);
        const [[applications]] = await query(getConnection, 'SELECT COUNT(*) AS total FROM application', []);
        ok(res, {
            summary: {
                opportunities: Number(opportunities.total) || 0,
                companies: Number(opportunities.companies) || 0,
                users: Number(users.total) || 0,
                skills: Number(skills.total) || 0,
                applications: Number(applications.total) || 0
            }
        });
    }));

    router.get('/api/panel/skills', asyncRoute(async (req, res) => {
        const [skills] = await query(
            getConnection,
            `SELECT c.id_skill, c.nom, c.categorie, COUNT(DISTINCT us.id_user) AS users,
                    COUNT(DISTINCT o.id) AS demand
             FROM competence c
             LEFT JOIN user_skill us ON us.id_skill = c.id_skill
             LEFT JOIN opportunities o ON LOWER(o.skills) LIKE CONCAT('%', LOWER(c.nom), '%')
             GROUP BY c.id_skill, c.nom, c.categorie
             ORDER BY demand DESC, users DESC, c.nom ASC
             LIMIT 200`,
            []
        );
        ok(res, { skills: skills.map(row => Object.assign(row, { name: row.nom, category: row.categorie })) });
    }));

    router.get('/api/panel/users', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
        const [users] = await query(
            getConnection,
            `SELECT id_user, nom, prenom, email, telephone, localisation, role, date_inscription
             FROM utilisateur ORDER BY date_inscription DESC LIMIT 200`,
            []
        );
        ok(res, { users: users.map(row => Object.assign(row, { id: row.id_user, name: [row.prenom, row.nom].filter(Boolean).join(' ') || row.email })) });
    }));

    router.get('/api/admin/roles', requireAuth, requireAdmin, rate.admin, asyncRoute(async (req, res) => {
        const [roles] = await query(getConnection, 'SELECT * FROM roles ORDER BY code', []);
        const [permissions] = await query(getConnection, 'SELECT * FROM permissions ORDER BY code', []);
        const [links] = await query(getConnection, 'SELECT * FROM role_permissions', []);
        ok(res, { roles, permissions, rolePermissions: links });
    }));

    router.put('/api/admin/roles/:role/permissions', requireAuth, requireAdmin, rate.admin, asyncRoute(async (req, res) => {
        const [roles] = await query(getConnection, 'SELECT id_role FROM roles WHERE code = ?', [req.params.role]);
        if (!roles.length) throw httpError(404, 'role_not_found', 'Role not found');
        const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
        const connection = await getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('DELETE FROM role_permissions WHERE id_role = ?', [roles[0].id_role]);
            for (const permission of permissions) {
                const [rows] = await connection.execute('SELECT id_permission FROM permissions WHERE code = ?', [permission]);
                if (rows.length) {
                    await connection.execute('INSERT INTO role_permissions (id_role, id_permission) VALUES (?, ?)', [roles[0].id_role, rows[0].id_permission]);
                }
            }
            await connection.execute('DELETE FROM auth_sessions');
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        await audit(getConnection, req, 'admin.role_permissions.update', 'role', req.params.role, { permissions });
        ok(res, { message: 'Role permissions updated' });
    }));

    router.get('/api/admin/invoices', requireAuth, requireAdmin, rate.admin, asyncRoute(async (req, res) => {
        const [invoices] = await query(
            getConnection,
            `SELECT bi.*, bs.status AS subscription_status, pc.name AS plan_name
             FROM billing_invoice bi
             LEFT JOIN billing_subscription bs ON bs.id_subscription = bi.id_subscription
             LEFT JOIN plan_catalogue pc ON pc.id_plan = bs.id_plan
             ORDER BY bi.created_at DESC LIMIT ?`,
            [clampInt(req.query.limit, 1, 100, 50)]
        );
        ok(res, { invoices });
    }));

    router.get('/api/admin/invoices/:id/download', requireAuth, requireAdmin, rate.admin, asyncRoute(async (req, res) => {
        const [rows] = await query(getConnection, 'SELECT * FROM billing_invoice WHERE id_invoice = ? LIMIT 1', [req.params.id]);
        if (!rows.length) throw httpError(404, 'invoice_not_found', 'Invoice not found');
        const invoice = rows[0];
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.txt"`);
        res.send([
            'THEWAY Invoice',
            `Number: ${invoice.invoice_number}`,
            `Status: ${invoice.status}`,
            `Amount: ${invoice.amount} ${invoice.currency}`,
            `Issued: ${invoice.issued_at || ''}`,
            `Due: ${invoice.due_at || ''}`,
            '',
            invoice.notes || ''
        ].join('\n'));
    }));

    router.get('/api/docs/openapi.json', (req, res) => {
        ok(res, openApiDocument());
    });

    router.all('/api/auth/session', methodNotAllowed(['GET']));
    return router;
};

async function query(getConnection, sql, params) {
    const connection = await getConnection();
    try {
        return connection.execute(sql, params || []);
    } finally {
        connection.release();
    }
}

async function execute(getConnection, sql, params) {
    return query(getConnection, sql, params);
}

async function createUser(getConnection, input) {
    const connection = await getConnection();
    try {
        await connection.beginTransaction();
        const [existing] = await connection.execute('SELECT id_user FROM utilisateur WHERE email = ?', [input.email]);
        if (existing.length) throw httpError(409, 'email_in_use', 'An account already exists for this email');
        const paramId = crypto.randomUUID();
        const userId = crypto.randomUUID();
        await connection.execute('INSERT INTO parametres (id_params, notification_email, notification_push) VALUES (?, ?, ?)', [paramId, 'enabled', 'enabled']);
        await connection.execute(
            `INSERT INTO utilisateur (id_user, id_params, nom, prenom, email, password, telephone, localisation, role)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, paramId, input.nom, input.prenom, input.email, await hashPassword(input.password), input.telephone, input.localisation, input.role || 'user']
        );
        await assignRole(connection, userId, input.role || 'user', null);
        await connection.commit();
        return Object.assign({}, input, { id_user: userId, password: undefined });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function findUserByEmail(getConnection, email) {
    const [rows] = await query(getConnection, 'SELECT * FROM utilisateur WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
}

async function findUserById(getConnection, id) {
    const [rows] = await query(getConnection, 'SELECT * FROM utilisateur WHERE id_user = ? LIMIT 1', [id]);
    return rows[0] || null;
}

async function roleCodesForUser(getConnection, userId) {
    const [rows] = await query(getConnection, 'SELECT r.code FROM user_roles ur JOIN roles r ON r.id_role = ur.id_role WHERE ur.id_user = ?', [userId]);
    return rows.map(row => row.code);
}

async function assignRole(connection, userId, roleCode, grantedBy) {
    const [roles] = await connection.execute('SELECT id_role FROM roles WHERE code = ? LIMIT 1', [roleCode]);
    if (!roles.length) return;
    await connection.execute('INSERT IGNORE INTO user_roles (id_user, id_role, granted_by) VALUES (?, ?, ?)', [userId, roles[0].id_role, grantedBy]);
}

function publicUser(user, roles, permissions) {
    return {
        id: user.id_user,
        id_user: user.id_user,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone || null,
        localisation: user.localisation || null,
        photo: user.photo || null,
        role: roles.includes('admin') ? 'admin' : (roles[0] || user.role || 'user'),
        roles,
        permissions
    };
}

async function establishSession(req, user) {
    await regenerateSession(req);
    req.session.userId = user.id_user;
    req.session.ipAddress = req.ip || null;
    req.session.userAgent = req.headers['user-agent'] || null;
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    await saveSession(req);
}

function regenerateSession(req) {
    return new Promise((resolve, reject) => {
        req.session.regenerate(error => error ? reject(error) : resolve());
    });
}

function destroySession(req) {
    return new Promise((resolve, reject) => {
        if (!req.session) return resolve();
        req.session.destroy(error => error ? reject(error) : resolve());
    });
}

function saveSession(req) {
    return new Promise((resolve, reject) => {
        req.session.save(error => error ? reject(error) : resolve());
    });
}

function normaliseEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function assertEmail(email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw httpError(400, 'email_invalid', 'A valid email is required');
    }
}

function assertPassword(password) {
    const value = String(password || '');
    if (value.length < 10) {
        throw httpError(400, 'password_weak', 'Password must be at least 10 characters');
    }
}

function requiredText(value, label) {
    const text = String(value || '').trim();
    if (!text) throw httpError(400, 'field_required', `${label} is required`);
    return text;
}

function cleanNullable(value) {
    const text = String(value === undefined || value === null ? '' : value).trim();
    return text || null;
}

function splitName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    const prenom = parts.shift() || '';
    return { prenom, nom: parts.join(' ') || prenom || '' };
}

function sha256(value) {
    return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function sha256Buffer(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function insertResetToken(getConnection, userId, tokenHash, req) {
    await execute(
        getConnection,
        `INSERT INTO password_reset_tokens
         (id_reset_token, id_user, token_hash, requested_ip, requested_user_agent, expires_at)
         VALUES (?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR))`,
        [crypto.randomUUID(), userId, tokenHash, req.ip || null, req.headers['user-agent'] || null]
    );
}

function providerConfig(name) {
    const provider = String(name || '').toLowerCase();
    if (provider === 'google') {
        if (!config.oauth.google.clientId || !config.oauth.google.clientSecret) throw httpError(503, 'oauth_not_configured', 'Google login is not configured');
        return {
            name: 'google',
            issuer: 'https://accounts.google.com',
            clientId: config.oauth.google.clientId,
            clientSecret: config.oauth.google.clientSecret
        };
    }
    if (provider === 'linkedin') {
        if (!config.oauth.linkedin.clientId || !config.oauth.linkedin.clientSecret) throw httpError(503, 'oauth_not_configured', 'LinkedIn login is not configured');
        return {
            name: 'linkedin',
            issuer: 'https://www.linkedin.com/oauth',
            clientId: config.oauth.linkedin.clientId,
            clientSecret: config.oauth.linkedin.clientSecret
        };
    }
    throw httpError(404, 'oauth_provider_unknown', 'OAuth provider not supported');
}

async function oidcClient(provider, redirectUri) {
    const issuer = await Issuer.discover(provider.issuer);
    return new issuer.Client({
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
        redirect_uris: [redirectUri],
        response_types: ['code']
    });
}

async function findOrCreateOAuthUser(getConnection, provider, info, tokenSet) {
    const subject = requiredText(info.sub || info.id, 'Provider subject');
    const email = normaliseEmail(info.email);
    assertEmail(email);
    const connection = await getConnection();
    try {
        await connection.beginTransaction();
        const [accounts] = await connection.execute('SELECT id_user FROM auth_accounts WHERE provider = ? AND provider_subject = ? LIMIT 1', [provider, subject]);
        if (accounts.length) {
            const [users] = await connection.execute('SELECT * FROM utilisateur WHERE id_user = ? LIMIT 1', [accounts[0].id_user]);
            await connection.commit();
            return users[0];
        }
        let [users] = await connection.execute('SELECT * FROM utilisateur WHERE email = ? LIMIT 1', [email]);
        let user = users[0];
        if (!user) {
            const paramId = crypto.randomUUID();
            const userId = crypto.randomUUID();
            const names = splitName(info.name || email.split('@')[0]);
            await connection.execute('INSERT INTO parametres (id_params, notification_email, notification_push) VALUES (?, ?, ?)', [paramId, 'enabled', 'enabled']);
            await connection.execute(
                `INSERT INTO utilisateur (id_user, id_params, nom, prenom, email, password, role)
                 VALUES (?, ?, ?, ?, ?, ?, 'user')`,
                [userId, paramId, names.nom || 'OAuth', names.prenom || 'User', email, await hashPassword(crypto.randomBytes(24).toString('hex'))]
            );
            await assignRole(connection, userId, 'user', null);
            users = (await connection.execute('SELECT * FROM utilisateur WHERE id_user = ? LIMIT 1', [userId]))[0];
            user = users[0];
        }
        await connection.execute(
            `INSERT INTO auth_accounts
             (id_auth_account, id_user, provider, provider_subject, email, display_name, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                crypto.randomUUID(),
                user.id_user,
                provider,
                subject,
                email,
                info.name || null,
                tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : null
            ]
        );
        await connection.commit();
        return user;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

function sanitisePhoto(photo) {
    if (!photo) return null;
    const value = String(photo).trim();
    if (/^https:\/\/[^\s"'<>]+$/i.test(value) || /^\/?api\/files\/[A-Za-z0-9-]+$/i.test(value) || /^\/?assets\/uploads\/[A-Za-z0-9._/-]+$/i.test(value)) {
        return value;
    }
    throw httpError(400, 'photo_invalid', 'Photo URL is invalid');
}

async function listOpportunities(getConnection, req) {
    const queryParams = req.query || {};
    const limit = clampInt(queryParams.limit, 1, 100, 20);
    const page = clampInt(queryParams.page, 1, 100000, 1);
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];
    if (queryParams.search || queryParams.q) {
        const like = `%${String(queryParams.search || queryParams.q).trim()}%`;
        where.push('(title LIKE ? OR company LIKE ? OR description LIKE ? OR skills LIKE ?)');
        params.push(like, like, like, like);
    }
    if (queryParams.location) {
        where.push('location LIKE ?');
        params.push(`%${String(queryParams.location).trim()}%`);
    }
    if (queryParams.skill) {
        where.push('skills LIKE ?');
        params.push(`%${String(queryParams.skill).trim()}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[count]] = await query(getConnection, `SELECT COUNT(*) AS total FROM opportunities ${whereSql}`, params);
    const [rows] = await query(
        getConnection,
        `SELECT id, uid, source, title, company, location, source_url, description, skills, created_at
         FROM opportunities ${whereSql}
         ORDER BY created_at DESC, id DESC
         LIMIT ? OFFSET ?`,
        params.concat([limit, offset])
    );
    const opportunities = rows.map(publicOpportunity);
    if (req.userId && opportunities.length) {
        const ids = opportunities.map(item => item.id);
        const [saved] = await query(getConnection, `SELECT opportunity_id FROM saved_opportunity WHERE id_user = ? AND opportunity_id IN (${ids.map(() => '?').join(',')})`, [req.userId].concat(ids));
        const [applications] = await query(getConnection, `SELECT opportunity_id FROM application WHERE id_user = ? AND opportunity_id IN (${ids.map(() => '?').join(',')})`, [req.userId].concat(ids));
        const savedSet = new Set(saved.map(row => row.opportunity_id));
        const applicationSet = new Set(applications.map(row => row.opportunity_id));
        opportunities.forEach(item => {
            item.saved = savedSet.has(item.id);
            item.applied = applicationSet.has(item.id);
        });
    }
    return {
        opportunities,
        pagination: { page, limit, total: Number(count.total) || 0 }
    };
}

async function listMatchingOpportunities(getConnection, skills) {
    const candidateSkills = (skills || [])
        .map(skill => String(skill || '').trim())
        .filter(Boolean)
        .slice(0, 12);
    if (!candidateSkills.length) {
        return (await listOpportunities(getConnection, { query: { limit: 100 } })).opportunities;
    }

    const clauses = [];
    const params = [];
    candidateSkills.forEach(skill => {
        const like = `%${skill.toLowerCase()}%`;
        clauses.push('(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(skills) LIKE ?)');
        params.push(like, like, like);
    });
    const [rows] = await query(
        getConnection,
        `SELECT id, uid, source, title, company, location, source_url, description, skills, created_at
         FROM opportunities
         WHERE ${clauses.join(' OR ')}
         ORDER BY created_at DESC, id DESC
         LIMIT 500`,
        params
    );
    return rows.map(publicOpportunity);
}

async function getOpportunity(getConnection, id) {
    const numeric = Number(id);
    const sql = Number.isInteger(numeric)
        ? 'SELECT * FROM opportunities WHERE id = ? LIMIT 1'
        : 'SELECT * FROM opportunities WHERE uid = ? LIMIT 1';
    const [rows] = await query(getConnection, sql, [id]);
    return rows[0] ? publicOpportunity(rows[0]) : null;
}

function publicOpportunity(row) {
    return {
        id: row.id,
        uid: row.uid,
        source: row.source,
        title: row.title,
        company: row.company,
        location: row.location,
        source_url: row.source_url,
        description: row.description,
        skills: parseSkills(row.skills),
        created_at: row.created_at
    };
}

function parseSkills(value) {
    if (Array.isArray(value)) return value;
    const raw = String(value || '').trim();
    if (!raw) return [];
    if (raw.startsWith('[')) {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }
    return raw.split(',').map(item => item.trim()).filter(Boolean);
}

async function upsertSkill(getConnection, name, category) {
    const id = crypto.randomUUID();
    await execute(
        getConnection,
        `INSERT INTO competence (id_skill, nom, categorie)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE categorie = COALESCE(VALUES(categorie), categorie)`,
        [id, name, category]
    );
    const [rows] = await query(getConnection, 'SELECT * FROM competence WHERE nom = ? LIMIT 1', [name]);
    return rows[0];
}

function toUserSkill(skill, niveau, score) {
    return {
        id: skill.id_skill,
        id_skill: skill.id_skill,
        nom: skill.nom,
        categorie: skill.categorie,
        niveau,
        score
    };
}

async function syncExtractedSkills(getConnection, userId, extractedSkills) {
    const names = Array.from(new Set((extractedSkills || [])
        .map(skill => typeof skill === 'string' ? skill : (skill && (skill.nom || skill.name)))
        .map(skill => String(skill || '').trim())
        .filter(Boolean)))
        .slice(0, 50);
    const synced = [];
    for (const name of names) {
        const skill = await upsertSkill(getConnection, name, 'CV');
        await execute(
            getConnection,
            `INSERT INTO user_skill (id_user_skill, id_user, id_skill, niveau, score)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                niveau = COALESCE(user_skill.niveau, VALUES(niveau)),
                score = GREATEST(COALESCE(user_skill.score, 0), VALUES(score))`,
            [crypto.randomUUID(), userId, skill.id_skill, 'extrait du CV', 70]
        );
        synced.push(skill);
    }
    return synced;
}

function clampInt(value, min, max, fallback) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
}

function normaliseStatus(value, allowed, fallback) {
    const normalised = String(value || '').trim().toLowerCase();
    return allowed.includes(normalised) ? normalised : fallback;
}

async function getOwnedCv(getConnection, userId, idCv) {
    const [rows] = await query(getConnection, 'SELECT * FROM cv WHERE id_cv = ? AND id_user = ? LIMIT 1', [idCv, userId]);
    if (!rows.length) throw httpError(404, 'cv_not_found', 'CV not found');
    return rows[0];
}

async function latestCv(getConnection, userId) {
    const [rows] = await query(getConnection, 'SELECT * FROM cv WHERE id_user = ? ORDER BY date_upload DESC LIMIT 1', [userId]);
    return rows[0] || null;
}

async function latestCvAnalysis(getConnection, userId, idCv) {
    const [rows] = await query(getConnection, 'SELECT * FROM cv_analysis WHERE id_user = ? AND id_cv = ? ORDER BY created_at DESC LIMIT 1', [userId, idCv]);
    return rows[0] || null;
}

async function userSkillNames(getConnection, userId) {
    const [rows] = await query(getConnection, 'SELECT c.nom FROM user_skill us JOIN competence c ON c.id_skill = us.id_skill WHERE us.id_user = ?', [userId]);
    return rows.map(row => row.nom);
}

async function findMatchingRunByKey(getConnection, userId, key) {
    const [rows] = await query(getConnection, 'SELECT * FROM matching_run WHERE id_user = ? AND idempotency_key = ? LIMIT 1', [userId, key]);
    return rows[0] || null;
}

function safeJson(value, fallback) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch (error) {
        return fallback;
    }
}

function objectFromSettings(rows) {
    return rows.reduce((acc, row) => {
        acc[row.setting_key] = safeJson(row.value_json, null);
        return acc;
    }, {});
}

async function setAppSetting(getConnection, key, value, userId) {
    await execute(
        getConnection,
        `INSERT INTO app_setting (setting_key, value_json, is_public, updated_by)
         VALUES (?, ?, FALSE, ?)
         ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP`,
        [key, JSON.stringify(value), userId]
    );
}

function slug(value) {
    return String(value || 'integration').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'integration';
}

function openApiDocument() {
    return {
        openapi: '3.1.0',
        info: { title: 'THEWAY API', version: '1.0.0' },
        paths: {
            '/api/auth/register': { post: { summary: 'Register a user' } },
            '/api/auth/login': { post: { summary: 'Create a session' } },
            '/api/auth/session': { get: { summary: 'Get current session' } },
            '/api/opportunities': { get: { summary: 'Search opportunities' } },
            '/api/cv/{id}/analyse': { post: { summary: 'Run LLM CV analysis' } },
            '/api/matching/run': { post: { summary: 'Run LLM opportunity matching' } },
            '/api/admin/roles': { get: { summary: 'List roles and permissions' } }
        },
        components: {
            securitySchemes: {
                sessionCookie: { type: 'apiKey', in: 'cookie', name: 'theway.sid' },
                csrfToken: { type: 'apiKey', in: 'header', name: 'X-CSRF-Token' }
            }
        }
    };
}

async function exportRows(getConnection, req, kind) {
    if (kind === 'users') {
        const [rows] = await query(getConnection, 'SELECT prenom, nom, email, role, date_inscription FROM utilisateur ORDER BY date_inscription DESC LIMIT 1000', []);
        return [['First name', 'Last name', 'Email', 'Role', 'Registered at']].concat(rows.map(row => [row.prenom, row.nom, row.email, row.role, row.date_inscription]));
    }
    if (kind === 'skills' || kind === 'competences') {
        const [rows] = await query(getConnection, 'SELECT nom, categorie, created_at FROM competence ORDER BY nom ASC LIMIT 1000', []);
        return [['Skill', 'Category', 'Created at']].concat(rows.map(row => [row.nom, row.categorie, row.created_at]));
    }
    if (kind === 'cv') {
        const [rows] = await query(getConnection, 'SELECT id_cv, fichier, date_upload, scann_analyse FROM cv WHERE id_user = ? ORDER BY date_upload DESC', [req.userId]);
        return [['CV id', 'File id', 'Uploaded at', 'Analysis']].concat(rows.map(row => [row.id_cv, row.fichier, row.date_upload, row.scann_analyse]));
    }
    if (kind === 'invoice') {
        const [rows] = await query(getConnection, 'SELECT invoice_number, status, amount, currency, issued_at, due_at, paid_at FROM billing_invoice ORDER BY created_at DESC LIMIT 1000', []);
        return [['Invoice', 'Status', 'Amount', 'Currency', 'Issued', 'Due', 'Paid']].concat(rows.map(row => [row.invoice_number, row.status, row.amount, row.currency, row.issued_at, row.due_at, row.paid_at]));
    }
    const [[opportunities]] = await query(getConnection, 'SELECT COUNT(*) AS total FROM opportunities', []);
    const [[users]] = await query(getConnection, 'SELECT COUNT(*) AS total FROM utilisateur', []);
    const [[applications]] = await query(getConnection, 'SELECT COUNT(*) AS total FROM application', []);
    return [
        ['Metric', 'Value'],
        ['Opportunities', opportunities.total],
        ['Users', users.total],
        ['Applications', applications.total]
    ];
}

function toCsv(rows) {
    return rows.map(row => row.map(cell => `"${String(cell === undefined || cell === null ? '' : cell).replace(/"/g, '""')}"`).join(',')).join('\n') + '\n';
}
