const express = require('express');
const requireAdmin = require('../../middleware/requireAdmin');
const { id, pagination, normalizeLike, withConnection, httpError, respondError, demandedSkills, normalizeKey, categoryForSkill } = require('./helpers');

module.exports = function createAdminSkillsRouter(deps) {
    const router = express.Router();
    const { getConnection, verifyToken } = deps;

    router.get('/api/admin/skills', verifyToken, requireAdmin, async (req, res) => {
        try {
            const data = await withConnection(getConnection, async connection => {
                const { page, limit, offset } = pagination(req.query);
                const demand = await demandedSkills(connection);
                const where = [];
                const params = [];
                if (req.query.search) {
                    where.push('nom LIKE ?');
                    params.push(normalizeLike(req.query.search));
                }
                if (req.query.category) {
                    where.push('categorie = ?');
                    params.push(req.query.category);
                }
                const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';
                const [[count]] = await connection.execute(
                    `SELECT COUNT(*) AS total FROM competence ${whereSQL}`,
                    params
                );
                const [skills] = await connection.execute(
                    `SELECT c.id_skill, c.nom, c.categorie, c.created_at, COUNT(us.id_user_skill) AS users_count
                     FROM competence c
                     LEFT JOIN user_skill us ON us.id_skill = c.id_skill
                     ${whereSQL}
                     GROUP BY c.id_skill
                     ORDER BY c.created_at DESC
                     LIMIT ? OFFSET ?`,
                    params.concat([limit, offset])
                );

                const databaseSkills = skills.map(row => publicSkill(row, demand.get(normalizeKey(row.nom))));
                if (databaseSkills.length || req.query.search || req.query.category) {
                    return {
                        skills: databaseSkills,
                        pagination: { page, limit, total: Number(count.total) || 0 }
                    };
                }

                const derived = Array.from(demand.values())
                    .sort((left, right) => right.demand_count - left.demand_count)
                    .slice(offset, offset + limit)
                    .map(skill => ({
                        id: normalizeKey(skill.name),
                        id_skill: normalizeKey(skill.name),
                        nom: skill.name,
                        categorie: categoryForSkill(skill.name),
                        users_count: 0,
                        demand_count: skill.demand_count,
                        derived: true
                    }));
                return {
                    skills: derived,
                    pagination: { page, limit, total: demand.size }
                };
            });
            res.json({ ok: true, data });
        } catch (error) {
            respondError(res, error, 'Erreur compétences');
        }
    });

    router.post('/api/admin/skills', verifyToken, requireAdmin, async (req, res) => {
        try {
            const skillId = id();
            await withConnection(getConnection, async connection => {
                if (!req.body.nom && !req.body.name) throw httpError(400, 'Nom requis');
                await connection.execute(
                    'INSERT INTO competence (id_skill, nom, categorie) VALUES (?, ?, ?)',
                    [skillId, req.body.nom || req.body.name, req.body.categorie || req.body.category || null]
                );
            });
            res.status(201).json({ ok: true, data: { id_skill: skillId } });
        } catch (error) {
            respondError(res, error, 'Erreur création compétence');
        }
    });

    router.put('/api/admin/skills/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            await withConnection(getConnection, async connection => {
                const fields = [
                    ['nom', req.body.nom || req.body.name],
                    ['categorie', req.body.categorie || req.body.category]
                ].filter(item => item[1] !== undefined);
                if (!fields.length) throw httpError(400, 'Aucune donnée à mettre à jour');
                const [result] = await connection.execute(
                    'UPDATE competence SET ' + fields.map(item => item[0] + ' = ?').join(', ') + ' WHERE id_skill = ?',
                    fields.map(item => item[1] || null).concat([req.params.id])
                );
                if (!result.affectedRows) throw httpError(404, 'Compétence introuvable');
            });
            res.json({ ok: true });
        } catch (error) {
            respondError(res, error, 'Erreur modification compétence');
        }
    });

    router.delete('/api/admin/skills/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            await withConnection(getConnection, async connection => {
                const [result] = await connection.execute('DELETE FROM competence WHERE id_skill = ?', [req.params.id]);
                if (!result.affectedRows) throw httpError(404, 'Compétence introuvable');
            });
            res.json({ ok: true });
        } catch (error) {
            respondError(res, error, 'Erreur suppression compétence');
        }
    });

    return router;
};

function publicSkill(row, demand) {
    return {
        id: row.id_skill,
        id_skill: row.id_skill,
        nom: row.nom,
        name: row.nom,
        categorie: row.categorie,
        category: row.categorie,
        users_count: Number(row.users_count) || 0,
        demand_count: demand ? demand.demand_count : 0,
        created_at: row.created_at
    };
}
