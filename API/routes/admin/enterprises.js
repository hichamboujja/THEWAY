const express = require('express');
const requireAdmin = require('../../middleware/requireAdmin');
const { id, pagination, normalizeLike, withConnection, httpError, respondError } = require('./helpers');

module.exports = function createAdminEnterprisesRouter(deps) {
    const router = express.Router();
    const { getConnection, verifyToken } = deps;

    router.get('/api/admin/enterprises', verifyToken, requireAdmin, async (req, res) => {
        try {
            const data = await withConnection(getConnection, async connection => {
                const { page, limit, offset } = pagination(req.query);
                const where = [];
                const params = [];
                if (req.query.search) {
                    where.push('(e.nom LIKE ? OR e.localisation LIKE ? OR e.secteur LIKE ?)');
                    const like = normalizeLike(req.query.search);
                    params.push(like, like, like);
                }
                if (req.query.sector) {
                    where.push('e.secteur = ?');
                    params.push(req.query.sector);
                }
                if (req.query.size) {
                    where.push('e.taille = ?');
                    params.push(req.query.size);
                }
                const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';
                const [[count]] = await connection.execute(
                    `SELECT COUNT(*) AS total FROM entreprise e ${whereSQL}`,
                    params
                );
                const [rows] = await connection.execute(
                    `SELECT e.id_entreprise, e.nom, e.localisation, e.taille, e.secteur, e.site_web, e.created_at,
                            COUNT(o.id_offre) AS offers_count
                     FROM entreprise e
                     LEFT JOIN offre o ON o.id_entreprise = e.id_entreprise
                     ${whereSQL}
                     GROUP BY e.id_entreprise
                     ORDER BY e.created_at DESC
                     LIMIT ? OFFSET ?`,
                    params.concat([limit, offset])
                );
                return {
                    enterprises: rows.map(publicEnterprise),
                    pagination: { page, limit, total: Number(count.total) || 0 }
                };
            });
            res.json({ ok: true, data });
        } catch (error) {
            respondError(res, error, 'Erreur entreprises');
        }
    });

    router.get('/api/admin/enterprises/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            const data = await withConnection(getConnection, async connection => {
                const [rows] = await connection.execute(
                    `SELECT e.id_entreprise, e.nom, e.localisation, e.taille, e.secteur, e.site_web, e.created_at,
                            COUNT(o.id_offre) AS offers_count
                     FROM entreprise e
                     LEFT JOIN offre o ON o.id_entreprise = e.id_entreprise
                     WHERE e.id_entreprise = ?
                     GROUP BY e.id_entreprise`,
                    [req.params.id]
                );
                if (!rows.length) throw httpError(404, 'Entreprise introuvable');
                return publicEnterprise(rows[0]);
            });
            res.json({ ok: true, data });
        } catch (error) {
            respondError(res, error, 'Erreur entreprise');
        }
    });

    router.post('/api/admin/enterprises', verifyToken, requireAdmin, async (req, res) => {
        try {
            const enterpriseId = id();
            await withConnection(getConnection, async connection => {
                if (!req.body.nom) throw httpError(400, 'Nom requis');
                await connection.execute(
                    'INSERT INTO entreprise (id_entreprise, nom, localisation, taille, secteur, site_web) VALUES (?, ?, ?, ?, ?, ?)',
                    [
                        enterpriseId,
                        req.body.nom,
                        req.body.localisation || null,
                        req.body.taille || null,
                        req.body.secteur || null,
                        req.body.site_web || null
                    ]
                );
            });
            res.status(201).json({ ok: true, data: { id_entreprise: enterpriseId } });
        } catch (error) {
            respondError(res, error, 'Erreur création entreprise');
        }
    });

    router.put('/api/admin/enterprises/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            await withConnection(getConnection, async connection => {
                const fields = ['nom', 'localisation', 'taille', 'secteur', 'site_web'];
                const updates = fields.filter(field => req.body[field] !== undefined);
                if (!updates.length) throw httpError(400, 'Aucune donnée à mettre à jour');
                const [result] = await connection.execute(
                    'UPDATE entreprise SET ' + updates.map(field => field + ' = ?').join(', ') + ' WHERE id_entreprise = ?',
                    updates.map(field => req.body[field] || null).concat([req.params.id])
                );
                if (!result.affectedRows) throw httpError(404, 'Entreprise introuvable');
            });
            res.json({ ok: true });
        } catch (error) {
            respondError(res, error, 'Erreur modification entreprise');
        }
    });

    router.delete('/api/admin/enterprises/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            await withConnection(getConnection, async connection => {
                const [result] = await connection.execute('DELETE FROM entreprise WHERE id_entreprise = ?', [req.params.id]);
                if (!result.affectedRows) throw httpError(404, 'Entreprise introuvable');
            });
            res.json({ ok: true });
        } catch (error) {
            respondError(res, error, 'Erreur suppression entreprise');
        }
    });

    return router;
};

function publicEnterprise(row) {
    return {
        id: row.id_entreprise,
        id_entreprise: row.id_entreprise,
        nom: row.nom,
        name: row.nom,
        localisation: row.localisation,
        taille: row.taille,
        secteur: row.secteur,
        site_web: row.site_web,
        created_at: row.created_at,
        offers_count: Number(row.offers_count) || 0
    };
}
