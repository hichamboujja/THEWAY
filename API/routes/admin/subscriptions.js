const express = require('express');
const requireAdmin = require('../../middleware/requireAdmin');
const { id, pagination, withConnection, ensureAdminTables, httpError, respondError } = require('./helpers');

module.exports = function createAdminSubscriptionsRouter(deps) {
    const router = express.Router();
    const { getConnection, verifyToken } = deps;

    router.get('/api/admin/subscriptions', verifyToken, requireAdmin, async (req, res) => {
        try {
            const data = await withConnection(getConnection, async connection => {
                await ensureAdminTables(connection);
                const { page, limit, offset } = pagination(req.query);
                const [[count]] = await connection.execute('SELECT COUNT(*) AS total FROM abonnement');
                const [rows] = await connection.execute(
                    `SELECT a.id_abonnement, a.id_entreprise, a.plan, a.status, a.start_date, a.end_date, a.price, a.created_at,
                            e.nom AS entreprise
                     FROM abonnement a
                     LEFT JOIN entreprise e ON e.id_entreprise = a.id_entreprise
                     ORDER BY a.created_at DESC
                     LIMIT ? OFFSET ?`,
                    [limit, offset]
                );
                return {
                    subscriptions: rows.map(publicSubscription),
                    pagination: { page, limit, total: Number(count.total) || 0 }
                };
            });
            res.json({ ok: true, data });
        } catch (error) {
            respondError(res, error, 'Erreur abonnements');
        }
    });

    router.post('/api/admin/subscriptions', verifyToken, requireAdmin, async (req, res) => {
        try {
            const subscriptionId = id();
            await withConnection(getConnection, async connection => {
                await ensureAdminTables(connection);
                if (!req.body.plan) throw httpError(400, 'Plan requis');
                await connection.execute(
                    'INSERT INTO abonnement (id_abonnement, id_entreprise, plan, status, start_date, end_date, price) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [subscriptionId, req.body.id_entreprise || null, req.body.plan, req.body.status || 'active', req.body.start_date || null, req.body.end_date || null, req.body.price || 0]
                );
            });
            res.status(201).json({ ok: true, data: { id_abonnement: subscriptionId } });
        } catch (error) {
            respondError(res, error, 'Erreur création abonnement');
        }
    });

    router.put('/api/admin/subscriptions/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            await withConnection(getConnection, async connection => {
                await ensureAdminTables(connection);
                const fields = ['id_entreprise', 'plan', 'status', 'start_date', 'end_date', 'price'].filter(field => req.body[field] !== undefined);
                if (!fields.length) throw httpError(400, 'Aucune donnée à mettre à jour');
                const [result] = await connection.execute(
                    'UPDATE abonnement SET ' + fields.map(field => field + ' = ?').join(', ') + ' WHERE id_abonnement = ?',
                    fields.map(field => req.body[field] || null).concat([req.params.id])
                );
                if (!result.affectedRows) throw httpError(404, 'Abonnement introuvable');
            });
            res.json({ ok: true });
        } catch (error) {
            respondError(res, error, 'Erreur modification abonnement');
        }
    });

    router.delete('/api/admin/subscriptions/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            await withConnection(getConnection, async connection => {
                await ensureAdminTables(connection);
                const [result] = await connection.execute('DELETE FROM abonnement WHERE id_abonnement = ?', [req.params.id]);
                if (!result.affectedRows) throw httpError(404, 'Abonnement introuvable');
            });
            res.json({ ok: true });
        } catch (error) {
            respondError(res, error, 'Erreur suppression abonnement');
        }
    });

    return router;
};

function publicSubscription(row) {
    return {
        id: row.id_abonnement,
        id_abonnement: row.id_abonnement,
        id_entreprise: row.id_entreprise,
        entreprise: row.entreprise,
        plan: row.plan,
        status: row.status,
        start_date: row.start_date,
        end_date: row.end_date,
        price: Number(row.price) || 0,
        created_at: row.created_at
    };
}
