const express = require('express');
const requireAdmin = require('../../middleware/requireAdmin');
const { id, pagination, normalizeLike, withConnection, ensureAdminTables, httpError, respondError } = require('./helpers');

module.exports = function createAdminSupportRouter(deps) {
    const router = express.Router();
    const { getConnection, verifyToken } = deps;

    router.get('/api/admin/support', verifyToken, requireAdmin, async (req, res) => {
        try {
            const data = await withConnection(getConnection, async connection => {
                await ensureAdminTables(connection);
                const { page, limit, offset } = pagination(req.query);
                const where = [];
                const params = [];
                if (req.query.search) {
                    where.push('(t.subject LIKE ? OR t.message LIKE ? OR u.email LIKE ?)');
                    const like = normalizeLike(req.query.search);
                    params.push(like, like, like);
                }
                if (req.query.status) {
                    where.push('t.status = ?');
                    params.push(req.query.status);
                }
                if (req.query.priority) {
                    where.push('t.priority = ?');
                    params.push(req.query.priority);
                }
                const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';
                const [[count]] = await connection.execute(
                    `SELECT COUNT(*) AS total FROM support_ticket t LEFT JOIN utilisateur u ON u.id_user = t.id_user ${whereSQL}`,
                    params
                );
                const [tickets] = await connection.execute(
                    `SELECT t.id_ticket, t.id_user, t.subject, t.message, t.status, t.priority, t.created_at, t.updated_at,
                            u.email, u.nom, u.prenom
                     FROM support_ticket t
                     LEFT JOIN utilisateur u ON u.id_user = t.id_user
                     ${whereSQL}
                     ORDER BY t.updated_at DESC
                     LIMIT ? OFFSET ?`,
                    params.concat([limit, offset])
                );
                return {
                    tickets: tickets.map(publicTicket),
                    pagination: { page, limit, total: Number(count.total) || 0 }
                };
            });
            res.json({ ok: true, data });
        } catch (error) {
            respondError(res, error, 'Erreur support');
        }
    });

    router.post('/api/admin/support', verifyToken, requireAdmin, async (req, res) => {
        try {
            const ticketId = id();
            await withConnection(getConnection, async connection => {
                await ensureAdminTables(connection);
                if (!req.body.subject) throw httpError(400, 'Sujet requis');
                await connection.execute(
                    'INSERT INTO support_ticket (id_ticket, id_user, subject, message, status, priority) VALUES (?, ?, ?, ?, ?, ?)',
                    [ticketId, req.body.id_user || null, req.body.subject, req.body.message || null, req.body.status || 'open', req.body.priority || 'normal']
                );
            });
            res.status(201).json({ ok: true, data: { id_ticket: ticketId } });
        } catch (error) {
            respondError(res, error, 'Erreur création ticket');
        }
    });

    router.put('/api/admin/support/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            await withConnection(getConnection, async connection => {
                await ensureAdminTables(connection);
                const fields = ['subject', 'message', 'status', 'priority'].filter(field => req.body[field] !== undefined);
                if (!fields.length) throw httpError(400, 'Aucune donnée à mettre à jour');
                const [result] = await connection.execute(
                    'UPDATE support_ticket SET ' + fields.map(field => field + ' = ?').join(', ') + ' WHERE id_ticket = ?',
                    fields.map(field => req.body[field] || null).concat([req.params.id])
                );
                if (!result.affectedRows) throw httpError(404, 'Ticket introuvable');
            });
            res.json({ ok: true });
        } catch (error) {
            respondError(res, error, 'Erreur modification ticket');
        }
    });

    router.delete('/api/admin/support/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            await withConnection(getConnection, async connection => {
                await ensureAdminTables(connection);
                const [result] = await connection.execute('DELETE FROM support_ticket WHERE id_ticket = ?', [req.params.id]);
                if (!result.affectedRows) throw httpError(404, 'Ticket introuvable');
            });
            res.json({ ok: true });
        } catch (error) {
            respondError(res, error, 'Erreur suppression ticket');
        }
    });

    return router;
};

function publicTicket(row) {
    return {
        id: row.id_ticket,
        id_ticket: row.id_ticket,
        id_user: row.id_user,
        user: [row.prenom, row.nom].filter(Boolean).join(' ').trim() || row.email || null,
        email: row.email,
        subject: row.subject,
        message: row.message,
        status: row.status,
        priority: row.priority,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}
