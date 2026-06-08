const express = require('express');
const requireAdmin = require('../../middleware/requireAdmin');
const { id, withConnection, respondError } = require('./helpers');

module.exports = function createAdminSettingsRouter(deps) {
    const router = express.Router();
    const { getConnection, verifyToken } = deps;

    router.get('/api/admin/settings', verifyToken, requireAdmin, async (req, res) => {
        try {
            const data = await withConnection(getConnection, ensureSettings);
            res.json({ ok: true, data });
        } catch (error) {
            respondError(res, error, 'Erreur paramètres');
        }
    });

    router.put('/api/admin/settings', verifyToken, requireAdmin, async (req, res) => {
        try {
            const data = await withConnection(getConnection, async connection => {
                const current = await ensureSettings(connection);
                const fields = ['notification_email', 'notification_push', 'visibilite_profil', 'partage_donnees']
                    .filter(field => req.body[field] !== undefined);
                if (fields.length) {
                    await connection.execute(
                        'UPDATE parametres SET ' + fields.map(field => field + ' = ?').join(', ') + ' WHERE id_params = ?',
                        fields.map(field => req.body[field]).concat([current.id_params])
                    );
                }
                return await ensureSettings(connection);
            });
            res.json({ ok: true, data });
        } catch (error) {
            respondError(res, error, 'Erreur mise à jour paramètres');
        }
    });

    return router;
};

async function ensureSettings(connection) {
    const [rows] = await connection.execute(
        'SELECT id_params, notification_email, notification_push, visibilite_profil, partage_donnees, created_at FROM parametres ORDER BY created_at ASC LIMIT 1'
    );
    if (rows.length) return rows[0];
    const settingsId = id();
    await connection.execute(
        'INSERT INTO parametres (id_params, notification_email, notification_push, visibilite_profil, partage_donnees) VALUES (?, ?, ?, ?, ?)',
        [settingsId, 'enabled', 'enabled', 'public', 'disabled']
    );
    const [created] = await connection.execute(
        'SELECT id_params, notification_email, notification_push, visibilite_profil, partage_donnees, created_at FROM parametres WHERE id_params = ?',
        [settingsId]
    );
    return created[0];
}
