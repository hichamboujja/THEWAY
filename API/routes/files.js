const express = require('express');
const { streamCSV } = require('../lib/csvService');
const { canExport, queueAction, safeExportKind } = require('../lib/actionSecurity');

module.exports = function createFilesRouter(deps) {
    const router = express.Router();
    const { verifyToken, upload, fallbackStore } = deps;

    router.post('/file-upload', verifyToken, upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ ok: false, error: 'Fichier manquant' });
            }
            queueAction(fallbackStore, 'file.upload', req.userId, {
                originalName: req.file.originalname,
                filename: req.file.filename,
                size: req.file.size,
                page: req.body.page || null
            });

            res.json({
                ok: true,
                message: 'Fichier uploadé avec succès',
                file: {
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    size: req.file.size,
                    path: `/assets/uploads/files/${req.file.filename}`
                }
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ ok: false, error: 'Erreur upload' });
        }
    });

    router.post('/file-export', verifyToken, async (req, res) => {
        try {
            const exportKind = safeExportKind(req.body.kind);
            if (!canExport(req.userRole, exportKind)) {
                return res.status(403).json({ ok: false, error: 'Export non autorisé' });
            }

            queueAction(fallbackStore, 'file.export', req.userId, {
                userId: req.userId,
                kind: exportKind,
                page: req.body.page || null
            });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="export-${exportKind}.csv"`);
            await streamCSV(exportKind, res, fallbackStore);
        } catch (error) {
            res.status(500).json({ ok: false, error: 'Erreur export' });
        }
    });

    return router;
};
