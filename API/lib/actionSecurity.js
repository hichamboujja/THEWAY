const ALLOWED_EXPORT_KINDS = new Set(['summary', 'users', 'skills', 'competences', 'export', 'invoice', 'cv']);
const ADMIN_EXPORT_KINDS = new Set(['users', 'invoice']);

function queueAction(fallbackStore, type, userId, payload) {
    fallbackStore.recordAction(type, userId, payload).catch(error => {
        console.error('Action log error:', error);
    });
}

function userScopedPayload(req, res) {
    const ownerId = req.body.ownerId || req.body.userId || req.body.targetUserId;
    if (ownerId && String(ownerId) !== String(req.userId)) {
        res.status(403).json({ ok: false, error: 'Action non autorisée pour cette ressource' });
        return null;
    }
    return {
        userId: req.userId,
        page: req.body.page || null,
        label: req.body.label || null,
        action: req.body.action || null,
        saved: typeof req.body.saved === 'boolean' ? req.body.saved : undefined,
        kind: req.body.kind || null
    };
}

function safeExportKind(kind) {
    const normalized = String(kind || 'summary').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    return ALLOWED_EXPORT_KINDS.has(normalized) ? normalized : 'summary';
}

function canExport(userRole, exportKind) {
    if (!ADMIN_EXPORT_KINDS.has(exportKind)) return true;
    return ['admin', 'administrateur'].includes(String(userRole || '').toLowerCase());
}

module.exports = {
    queueAction,
    userScopedPayload,
    safeExportKind,
    canExport
};
