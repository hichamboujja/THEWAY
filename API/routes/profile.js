const express = require('express');

module.exports = function createProfileRouter(deps) {
    const router = express.Router();
    const { verifyToken, getConnection, fallbackStore } = deps;

    router.get('/api/profile', verifyToken, async (req, res) => {
        try {
            const connection = await getConnection();
            try {
                const [users] = await connection.execute(
                    'SELECT id_user, nom, prenom, email, telephone, localisation, photo, role FROM utilisateur WHERE id_user = ?',
                    [req.userId]
                );

                if (users.length === 0) {
                    return res.status(404).json({ ok: false, error: 'Utilisateur non trouvé' });
                }

                res.json({ ok: true, profile: users[0] });
            } finally {
                connection.release();
            }
        } catch (error) {
            if (fallbackStore.isDatabaseUnavailable(error)) {
                const fallbackUser = await fallbackStore.findUserById(req.userId);
                if (!fallbackUser) {
                    return res.status(404).json({ ok: false, error: 'Utilisateur non trouvé' });
                }
                return res.json({
                    ok: true,
                    mode: 'file',
                    profile: fallbackStore.publicUser(fallbackUser)
                });
            }
            res.status(500).json({ ok: false, error: 'Erreur profil' });
        }
    });

    router.put('/api/profile', verifyToken, async (req, res) => {
        const { nom, prenom, telephone, localisation } = req.body;
        const photo = sanitizePhoto(req.body.photo);
        if (photo.error) {
            return res.status(400).json({ ok: false, error: photo.error });
        }

        try {
            const connection = await getConnection();
            try {
                await connection.execute(
                    'UPDATE utilisateur SET nom = ?, prenom = ?, telephone = ?, localisation = ?, photo = ? WHERE id_user = ?',
                    [nom, prenom, telephone, localisation, photo.value, req.userId]
                );

                res.json({ ok: true, message: 'Profil mis à jour' });
            } finally {
                connection.release();
            }
        } catch (error) {
            if (fallbackStore.isDatabaseUnavailable(error)) {
                const updated = await fallbackStore.updateUser(req.userId, {
                    nom,
                    prenom,
                    telephone,
                    localisation,
                    photo: photo.value
                });
                if (!updated) {
                    return res.status(404).json({ ok: false, error: 'Utilisateur non trouvé' });
                }
                return res.json({
                    ok: true,
                    mode: 'file',
                    message: 'Profil mis à jour',
                    profile: fallbackStore.publicUser(updated)
                });
            }
            res.status(500).json({ ok: false, error: 'Erreur mise à jour profil' });
        }
    });

    return router;
};

function sanitizePhoto(photo) {
    if (photo === undefined || photo === null || photo === '') {
        return { value: null };
    }
    if (typeof photo !== 'string') {
        return { error: 'Photo invalide' };
    }

    const value = photo.trim();
    const safeImageData = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
    const safeHttpsURL = /^https:\/\/[^\s"'<>]+$/i.test(value);
    const safeUploadPath = /^\/?assets\/uploads\/[A-Za-z0-9._/-]+$/i.test(value);
    if (!safeImageData && !safeHttpsURL && !safeUploadPath) {
        return { error: 'Photo invalide' };
    }
    return { value: value };
}
