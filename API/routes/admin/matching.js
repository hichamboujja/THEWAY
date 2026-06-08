const express = require('express');
const requireAdmin = require('../../middleware/requireAdmin');
const { pagination, normalizeLike, withConnection, respondError, parseSkills } = require('./helpers');

module.exports = function createAdminMatchingRouter(deps) {
    const router = express.Router();
    const { getConnection, verifyToken } = deps;

    router.get('/api/admin/matching', verifyToken, requireAdmin, async (req, res) => {
        try {
            const data = await withConnection(getConnection, async connection => {
                const { page, limit, offset } = pagination(req.query);
                const where = [];
                const params = [];
                if (req.query.user) {
                    where.push('(u.nom LIKE ? OR u.prenom LIKE ? OR u.email LIKE ?)');
                    const like = normalizeLike(req.query.user);
                    params.push(like, like, like);
                }
                if (req.query.offer) {
                    where.push('o.titre LIKE ?');
                    params.push(normalizeLike(req.query.offer));
                }
                if (req.query.score) {
                    where.push('m.score >= ?');
                    params.push(Number(req.query.score) || 0);
                }
                const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';
                const [[count]] = await connection.execute(
                    `SELECT COUNT(*) AS total
                     FROM matching m
                     JOIN utilisateur u ON u.id_user = m.id_user
                     JOIN offre o ON o.id_offre = m.id_offre
                     ${whereSQL}`,
                    params
                );
                const [matches] = await connection.execute(
                    `SELECT m.id_matching, m.score, m.date_matching,
                            u.id_user, u.nom, u.prenom, u.email,
                            cv.id_cv, cv.fichier,
                            o.id_offre, o.titre, o.skills,
                            e.nom AS entreprise
                     FROM matching m
                     JOIN utilisateur u ON u.id_user = m.id_user
                     LEFT JOIN cv ON cv.id_cv = m.id_cv
                     JOIN offre o ON o.id_offre = m.id_offre
                     LEFT JOIN entreprise e ON e.id_entreprise = o.id_entreprise
                     ${whereSQL}
                     ORDER BY m.date_matching DESC
                     LIMIT ? OFFSET ?`,
                    params.concat([limit, offset])
                );
                return {
                    matches: matches.map(publicMatch),
                    emptyMessage: matches.length ? '' : 'Aucun matching disponible pour le moment.',
                    pagination: { page, limit, total: Number(count.total) || 0 }
                };
            });
            res.json({ ok: true, data });
        } catch (error) {
            respondError(res, error, 'Erreur matching');
        }
    });

    return router;
};

function publicMatch(row) {
    return {
        id: row.id_matching,
        id_matching: row.id_matching,
        score: Number(row.score) || 0,
        date_matching: row.date_matching,
        user: {
            id: row.id_user,
            name: [row.prenom, row.nom].filter(Boolean).join(' ').trim() || row.email,
            email: row.email
        },
        cv: row.id_cv ? { id: row.id_cv, fichier: row.fichier } : null,
        offer: {
            id: row.id_offre,
            title: row.titre,
            company: row.entreprise,
            skills: parseSkills(row.skills)
        },
        missingSkills: []
    };
}
