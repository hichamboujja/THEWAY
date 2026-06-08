module.exports = function requireAdmin(req, res, next) {
    if (!req.userId) {
        return res.status(401).json({ ok: false, error: 'Token manquant' });
    }
    if (req.userRole !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    next();
};
