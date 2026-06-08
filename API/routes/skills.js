const express = require('express');
const crypto = require('crypto');

module.exports = function createSkillsRouter(deps) {
    const router = express.Router();
    const { verifyToken, getConnection, fallbackStore } = deps;

    router.get('/api/skills', verifyToken, async (req, res) => {
        try {
            const connection = await getConnection();
            try {
                const [skills] = await connection.execute(
                    `SELECT c.id_skill, c.nom, c.categorie, us.niveau, us.score
                     FROM user_skill us
                     JOIN competence c ON c.id_skill = us.id_skill
                     WHERE us.id_user = ?
                     ORDER BY c.nom ASC LIMIT 500`,
                    [req.userId]
                );
                res.json({ ok: true, skills });
            } finally {
                connection.release();
            }
        } catch (error) {
            if (fallbackStore && fallbackStore.isDatabaseUnavailable(error)) {
                return res.json({ ok: true, mode: 'file', skills: await fallbackStore.listSkills() });
            }
            res.status(500).json({ ok: false, error: 'Erreur recuperation competences' });
        }
    });

    router.post('/api/skills', verifyToken, async (req, res) => {
        try {
            const name = requiredText(req.body && req.body.nom, 'Competence');
            const category = cleanNullable(req.body && req.body.categorie);
            const level = cleanNullable(req.body && req.body.niveau);
            const score = clampScore(req.body && req.body.score);
            const connection = await getConnection();
            try {
                const skill = await upsertSkill(connection, name, category);
                await connection.execute(
                    `INSERT INTO user_skill (id_user_skill, id_user, id_skill, niveau, score)
                     VALUES (?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE niveau = VALUES(niveau), score = VALUES(score)`,
                    [crypto.randomUUID(), req.userId, skill.id_skill, level, score]
                );
                res.json({ ok: true, message: 'Competence ajoutee', skill: toUserSkill(skill, level, score) });
            } finally {
                connection.release();
            }
        } catch (error) {
            if (fallbackStore && fallbackStore.isDatabaseUnavailable(error)) {
                const skill = await fallbackStore.addSkill({
                    nom: req.body && req.body.nom,
                    categorie: req.body && req.body.categorie,
                    niveau: req.body && req.body.niveau,
                    score: req.body && req.body.score
                });
                return res.json({ ok: true, mode: 'file', message: 'Competence ajoutee', skill });
            }
            const status = error.status || 500;
            res.status(status).json({ ok: false, error: error.message || 'Erreur competence' });
        }
    });

    router.put('/api/skills/:id', verifyToken, async (req, res) => {
        try {
            const connection = await getConnection();
            try {
                const [result] = await connection.execute(
                    'UPDATE user_skill SET niveau = ?, score = ? WHERE id_user = ? AND id_skill = ?',
                    [cleanNullable(req.body && req.body.niveau), clampScore(req.body && req.body.score), req.userId, req.params.id]
                );
                if (!result.affectedRows) return res.status(404).json({ ok: false, error: 'Competence introuvable' });
                const [skills] = await connection.execute(
                    `SELECT c.id_skill, c.nom, c.categorie, us.niveau, us.score
                     FROM user_skill us
                     JOIN competence c ON c.id_skill = us.id_skill
                     WHERE us.id_user = ? AND us.id_skill = ?
                     LIMIT 1`,
                    [req.userId, req.params.id]
                );
                res.json({ ok: true, message: 'Competence mise a jour', skill: skills[0] || null });
            } finally {
                connection.release();
            }
        } catch (error) {
            if (fallbackStore && fallbackStore.isDatabaseUnavailable(error)) {
                const skill = await fallbackStore.updateSkill(req.params.id, {
                    niveau: req.body && req.body.niveau,
                    score: req.body && req.body.score
                });
                if (!skill) return res.status(404).json({ ok: false, error: 'Competence introuvable' });
                return res.json({ ok: true, mode: 'file', message: 'Competence mise a jour', skill });
            }
            res.status(500).json({ ok: false, error: 'Erreur mise a jour competence' });
        }
    });

    router.delete('/api/skills/:id', verifyToken, async (req, res) => {
        try {
            const connection = await getConnection();
            try {
                const [result] = await connection.execute(
                    'DELETE FROM user_skill WHERE id_user = ? AND id_skill = ?',
                    [req.userId, req.params.id]
                );
                if (!result.affectedRows) return res.status(404).json({ ok: false, error: 'Competence introuvable' });
                res.json({ ok: true, message: 'Competence supprimee' });
            } finally {
                connection.release();
            }
        } catch (error) {
            if (fallbackStore && fallbackStore.isDatabaseUnavailable(error)) {
                const deleted = await fallbackStore.deleteSkill(req.params.id);
                if (!deleted) return res.status(404).json({ ok: false, error: 'Competence introuvable' });
                return res.json({ ok: true, mode: 'file', message: 'Competence supprimee' });
            }
            res.status(500).json({ ok: false, error: 'Erreur suppression competence' });
        }
    });

    return router;
};

async function upsertSkill(connection, name, category) {
    const id = crypto.randomUUID();
    await connection.execute(
        `INSERT INTO competence (id_skill, nom, categorie)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE categorie = COALESCE(VALUES(categorie), categorie)`,
        [id, name, category]
    );
    const [skills] = await connection.execute('SELECT * FROM competence WHERE nom = ? LIMIT 1', [name]);
    return skills[0];
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

function requiredText(value, label) {
    const text = String(value || '').trim();
    const error = new Error(`${label} requis`);
    error.status = 400;
    if (!text) throw error;
    return text;
}

function cleanNullable(value) {
    const text = String(value === undefined || value === null ? '' : value).trim();
    return text || null;
}

function clampScore(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(Math.max(parsed, 0), 100);
}
