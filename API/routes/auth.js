const express = require('express');
const authService = require('../services/authService');

module.exports = function createAuthRouter(deps) {
    const router = express.Router();

    router.post('/auth/register', async (req, res) => {
        respond(res, authService.registerUser(deps, req.body), 'Erreur d\'enregistrement');
    });

    router.post('/auth/login', async (req, res) => {
        respond(res, authService.loginUser(deps, req.body), 'Erreur de connexion');
    });

    router.post('/auth-password-recovery', async (req, res) => {
        respond(res, authService.requestPasswordRecovery(deps, req.body), 'Erreur de récupération');
    });

    router.post('/auth-social', async (req, res) => {
        const { provider, idToken } = req.body;

        if (!provider || !idToken) {
            return res.status(400).json({
                ok: false,
                error: 'Connexion sociale non configuree: un jeton OAuth fournisseur est requis.'
            });
        }

        res.status(501).json({
            ok: false,
            error: 'Verification OAuth serveur non configuree pour ce fournisseur.'
        });
    });

    return router;
};

function respond(res, work, fallbackMessage) {
    work
        .then(result => res.json(result))
        .catch(error => {
            console.error(fallbackMessage + ':', error);
            res.status(error.status || 500).json({
                ok: false,
                error: error.publicMessage || fallbackMessage
            });
        });
}
