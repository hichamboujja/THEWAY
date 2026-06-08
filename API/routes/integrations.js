const express = require('express');
const { queueAction, userScopedPayload } = require('../lib/actionSecurity');

module.exports = function createIntegrationsRouter(deps) {
    const router = express.Router();
    const { verifyToken, fallbackStore } = deps;

    router.post('/integration-connect', verifyToken, async (req, res) => {
        const scopedPayload = userScopedPayload(req, res);
        if (!scopedPayload) return;
        queueAction(fallbackStore, 'integration.connect', req.userId, scopedPayload);
        res.json({ ok: true, message: 'Intégration connectée', connected: true });
    });

    router.post('/integration-disconnect', verifyToken, async (req, res) => {
        const scopedPayload = userScopedPayload(req, res);
        if (!scopedPayload) return;
        queueAction(fallbackStore, 'integration.disconnect', req.userId, scopedPayload);
        res.json({ ok: true, message: 'Intégration déconnectée', disconnected: true });
    });

    router.post('/integration-update', verifyToken, async (req, res) => {
        const scopedPayload = userScopedPayload(req, res);
        if (!scopedPayload) return;
        queueAction(fallbackStore, 'integration.update', req.userId, scopedPayload);
        res.json({ ok: true, message: 'Intégration mise à jour', updated: true });
    });

    return router;
};
