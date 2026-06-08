const express = require('express');
const requireAdmin = require('../../middleware/requireAdmin');
const { id, pagination, normalizeLike, withConnection, httpError, respondError } = require('./helpers');
const { hashPassword } = require('../../lib/passwords');

module.exports = function createAdminUsersRouter(deps) {
    const router = express.Router();
    const { getConnection, verifyToken } = deps;

    router.get('/api/admin/users', verifyToken, requireAdmin, async (req, res) => {
        try {
            const data = await withConnection(getConnection, async connection => {
                const { page, limit, offset } = pagination(req.query);
                const where = [];
                const params = [];

                if (req.query.search) {
                    where.push('(nom LIKE ? OR prenom LIKE ? OR email LIKE ?)');
                    const like = normalizeLike(req.query.search);
                    params.push(like, like, like);
                }
                if (req.query.role) {
                    where.push('role = ?');
                    params.push(req.query.role);
                }

                const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';
                const [[count]] = await connection.execute(
                    `SELECT COUNT(*) AS total FROM utilisateur ${whereSQL}`,
                    params
                );
                const [users] = await connection.execute(
                    `SELECT id_user, id_params, nom, prenom, email, telephone, localisation, photo, role, date_inscription
                     FROM utilisateur ${whereSQL}
                     ORDER BY date_inscription DESC
                     LIMIT ? OFFSET ?`,
                    params.concat([limit, offset])
                );

                return {
                    users: users.map(publicUser),
                    pagination: { page, limit, total: Number(count.total) || 0 }
                };
            });
            res.json({ ok: true, data });
        } catch (error) {
            respondError(res, error, 'Erreur utilisateurs');
        }
    });

    router.get('/api/admin/users/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            const user = await withConnection(getConnection, async connection => {
                const [users] = await connection.execute(
                    'SELECT id_user, id_params, nom, prenom, email, telephone, localisation, photo, role, date_inscription FROM utilisateur WHERE id_user = ?',
                    [req.params.id]
                );
                if (!users.length) throw httpError(404, 'Utilisateur introuvable');
                return publicUser(users[0]);
            });
            res.json({ ok: true, data: user });
        } catch (error) {
            respondError(res, error, 'Erreur utilisateur');
        }
    });

    router.post('/api/admin/users', verifyToken, requireAdmin, async (req, res) => {
        try {
            const created = await withConnection(getConnection, async connection => {
                const required = ['nom', 'prenom', 'email', 'password'];
                required.forEach(field => {
                    if (!req.body[field]) throw httpError(400, 'Champ requis: ' + field);
                });
                const userId = id();
                const paramId = id();
                const password = await hashPassword(req.body.password);
                await connection.beginTransaction();
                try {
                    await connection.execute(
                        'INSERT INTO parametres (id_params, notification_email, notification_push) VALUES (?, ?, ?)',
                        [paramId, 'enabled', 'enabled']
                    );
                    await connection.execute(
                        `INSERT INTO utilisateur
                         (id_user, id_params, nom, prenom, email, password, telephone, localisation, photo, role)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            userId,
                            paramId,
                            req.body.nom,
                            req.body.prenom,
                            req.body.email,
                            password,
                            req.body.telephone || null,
                            req.body.localisation || null,
                            req.body.photo || null,
                            req.body.role || 'user'
                        ]
                    );
                    await connection.commit();
                } catch (error) {
                    await connection.rollback();
                    throw error;
                }
                return { id_user: userId };
            });
            res.status(201).json({ ok: true, data: created });
        } catch (error) {
            respondError(res, error, 'Erreur création utilisateur');
        }
    });

    router.put('/api/admin/users/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            await withConnection(getConnection, async connection => {
                const fields = ['nom', 'prenom', 'email', 'telephone', 'localisation', 'photo', 'role'];
                const updates = fields.filter(field => req.body[field] !== undefined);
                if (!updates.length && !req.body.password) throw httpError(400, 'Aucune donnée à mettre à jour');
                const sqlParts = updates.map(field => field + ' = ?');
                const params = updates.map(field => req.body[field] || null);
                if (req.body.password) {
                    sqlParts.push('password = ?');
                    params.push(await hashPassword(req.body.password));
                }
                params.push(req.params.id);
                const [result] = await connection.execute(
                    'UPDATE utilisateur SET ' + sqlParts.join(', ') + ' WHERE id_user = ?',
                    params
                );
                if (!result.affectedRows) throw httpError(404, 'Utilisateur introuvable');
            });
            res.json({ ok: true });
        } catch (error) {
            respondError(res, error, 'Erreur modification utilisateur');
        }
    });

    router.delete('/api/admin/users/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            await withConnection(getConnection, async connection => {
                const [result] = await connection.execute('DELETE FROM utilisateur WHERE id_user = ?', [req.params.id]);
                if (!result.affectedRows) throw httpError(404, 'Utilisateur introuvable');
            });
            res.json({ ok: true });
        } catch (error) {
            respondError(res, error, 'Erreur suppression utilisateur');
        }
    });

    return router;
};

function publicUser(row) {
    return {
        id: row.id_user,
        id_user: row.id_user,
        id_params: row.id_params,
        name: [row.prenom, row.nom].filter(Boolean).join(' ').trim() || row.email,
        nom: row.nom,
        prenom: row.prenom,
        email: row.email,
        telephone: row.telephone,
        localisation: row.localisation,
        photo: row.photo,
        role: row.role || 'user',
        date_inscription: row.date_inscription
    };
}
