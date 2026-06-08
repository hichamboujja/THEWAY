const express = require('express');
const requireAdmin = require('../../middleware/requireAdmin');
const { id, pagination, withConnection, httpError, respondError } = require('./helpers');

module.exports = function createAdminNotificationsRouter(deps) {
    const router = express.Router();
    const { getConnection, verifyToken } = deps;

    router.get('/api/admin/notifications', verifyToken, requireAdmin, async (req, res) => {
        try {
            const data = await withConnection(getConnection, async connection => {
                const { page, limit, offset } = pagination(req.query);
                const [[count]] = await connection.execute('SELECT COUNT(*) AS total FROM notification');
                const [[unread]] = await connection.execute('SELECT COUNT(*) AS total FROM notification WHERE lu = FALSE');
                const [rows] = await connection.execute(
                    'SELECT id_notification, type, message, date_notification, lu, created_at FROM notification ORDER BY date_notification DESC LIMIT ? OFFSET ?',
                    [limit, offset]
                );
                return {
                    notifications: rows,
                    unread: Number(unread.total) || 0,
                    pagination: { page, limit, total: Number(count.total) || 0 }
                };
            });
            res.json({ ok: true, data });
        } catch (error) {
            respondError(res, error, 'Erreur notifications');
        }
    });

    router.post('/api/admin/notifications', verifyToken, requireAdmin, async (req, res) => {
        try {
            const notificationId = id();
            await withConnection(getConnection, async connection => {
                if (!req.body.message) throw httpError(400, 'Message requis');
                await connection.execute(
                    'INSERT INTO notification (id_notification, type, message, lu) VALUES (?, ?, ?, ?)',
                    [notificationId, req.body.type || 'info', req.body.message, Boolean(req.body.lu)]
                );
            });
            res.status(201).json({ ok: true, data: { id_notification: notificationId } });
        } catch (error) {
            respondError(res, error, 'Erreur création notification');
        }
    });

    router.put('/api/admin/notifications/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            await withConnection(getConnection, async connection => {
                const fields = ['type', 'message', 'lu'].filter(field => req.body[field] !== undefined);
                if (!fields.length) throw httpError(400, 'Aucune donnée à mettre à jour');
                const [result] = await connection.execute(
                    'UPDATE notification SET ' + fields.map(field => field + ' = ?').join(', ') + ' WHERE id_notification = ?',
                    fields.map(field => field === 'lu' ? Boolean(req.body[field]) : req.body[field]).concat([req.params.id])
                );
                if (!result.affectedRows) throw httpError(404, 'Notification introuvable');
            });
            res.json({ ok: true });
        } catch (error) {
            respondError(res, error, 'Erreur modification notification');
        }
    });

    router.delete('/api/admin/notifications/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            await withConnection(getConnection, async connection => {
                await connection.execute('DELETE FROM user_notification WHERE id_notification = ?', [req.params.id]);
                const [result] = await connection.execute('DELETE FROM notification WHERE id_notification = ?', [req.params.id]);
                if (!result.affectedRows) throw httpError(404, 'Notification introuvable');
            });
            res.json({ ok: true });
        } catch (error) {
            respondError(res, error, 'Erreur suppression notification');
        }
    });

    return router;
};
