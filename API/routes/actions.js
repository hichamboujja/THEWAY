const express = require('express');
const { queueAction, userScopedPayload } = require('../lib/actionSecurity');

module.exports = function createActionsRouter(deps) {
    const router = express.Router();
    const { verifyToken, fallbackStore } = deps;

    router.post('/draft-create', verifyToken, async (req, res) => {
        const scopedPayload = userScopedPayload(req, res);
        if (!scopedPayload) return;
        scopedPayload.name = req.body.name || 'Nouveau brouillon';
        queueAction(fallbackStore, 'draft.create', req.userId, scopedPayload);

        res.json({
            ok: true,
            message: 'Brouillon créé avec succès',
            draft: {
                id: Date.now(),
                name: req.body.name || 'Nouveau brouillon',
                page: req.body.page,
                createdAt: new Date()
            }
        });
    });

    router.post('/entity-update', verifyToken, async (req, res) => {
        const scopedPayload = userScopedPayload(req, res);
        if (!scopedPayload) return;
        queueAction(fallbackStore, 'entity.update', req.userId, scopedPayload);
        res.json({ ok: true, message: 'Entité mise à jour', updated: true });
    });

    router.post('/entity-delete', verifyToken, async (req, res) => {
        const scopedPayload = userScopedPayload(req, res);
        if (!scopedPayload) return;
        queueAction(fallbackStore, 'entity.delete', req.userId, scopedPayload);
        res.json({ ok: true, message: 'Entité supprimée', deleted: true });
    });

    router.post('/opportunity-bookmark', verifyToken, async (req, res) => {
        const scopedPayload = userScopedPayload(req, res);
        if (!scopedPayload) return;
        queueAction(fallbackStore, 'opportunity.bookmark', req.userId, scopedPayload);
        res.json({
            ok: true,
            message: req.body.saved ? 'Opportunité enregistrée' : 'Opportunité retirée',
            saved: req.body.saved
        });
    });

    router.post('/process-run', verifyToken, async (req, res) => {
        queueAction(fallbackStore, 'process.run', req.userId, {
            userId: req.userId,
            action: req.body.action || null,
            label: req.body.label || null,
            page: req.body.page || null
        });
        res.json({
            ok: true,
            message: 'Processus lancé',
            action: req.body.action,
            status: 'completed'
        });
    });

    return router;
};
