const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { fail, httpError } = require('../lib/response');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_EXEMPT = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/auth/password-reset/request',
    '/api/auth/password-reset/confirm',
    '/auth/login',
    '/auth/register',
    '/auth-password-recovery',
    '/auth-social'
];

function attachCurrentUser(getConnection) {
    return async (req, res, next) => {
        try {
            const sessionUserId = req.session && req.session.userId;
            const bearerUser = !sessionUserId ? verifyLegacyBearer(req) : null;
            const userId = sessionUserId || (bearerUser && bearerUser.id_user);
            if (!userId) return next();

            const connection = await getConnection();
            try {
                const [rows] = await connection.execute(
                    `SELECT id_user, nom, prenom, email, telephone, localisation, photo, role
                     FROM utilisateur WHERE id_user = ? LIMIT 1`,
                    [userId]
                );
                if (!rows.length) {
                    if (req.session) req.session.destroy(() => {});
                    return next();
                }
                const user = rows[0];
                const [roles] = await connection.execute(
                    `SELECT r.code
                     FROM user_roles ur
                     JOIN roles r ON r.id_role = ur.id_role
                     WHERE ur.id_user = ?`,
                    [user.id_user]
                );
                const roleCodes = roles.map(row => row.code);
                if (!roleCodes.length && user.role) roleCodes.push(user.role);
                const [permissions] = await connection.execute(
                    `SELECT DISTINCT p.code
                     FROM user_roles ur
                     JOIN role_permissions rp ON rp.id_role = ur.id_role
                     JOIN permissions p ON p.id_permission = rp.id_permission
                     WHERE ur.id_user = ?`,
                    [user.id_user]
                );

                req.currentUser = publicUser(user, roleCodes, permissions.map(row => row.code));
                req.userId = user.id_user;
                req.userRole = roleCodes.includes('admin') ? 'admin' : (roleCodes[0] || user.role || 'user');
                req.userRoles = roleCodes;
                req.permissions = new Set(req.currentUser.permissions);
                next();
            } finally {
                connection.release();
            }
        } catch (error) {
            next(error);
        }
    };
}

function verifyLegacyBearer(req) {
    const header = req.headers.authorization || '';
    if (!header || !process.env.JWT_SECRET) return null;
    try {
        return jwt.verify(header.replace(/^Bearer\s+/i, ''), process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
}

function publicUser(user, roles, permissions) {
    return {
        id: user.id_user,
        id_user: user.id_user,
        nom: user.nom,
        prenom: user.prenom,
        fullName: [user.prenom, user.nom].filter(Boolean).join(' ').trim() || user.email,
        email: user.email,
        telephone: user.telephone,
        localisation: user.localisation,
        photo: user.photo,
        role: roles.includes('admin') ? 'admin' : (roles[0] || user.role || 'user'),
        roles,
        permissions
    };
}

function requireAuth(req, res, next) {
    if (!req.currentUser) {
        fail(res, 401, 'unauthenticated', 'Authentication required');
        return;
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!req.currentUser || !req.userRoles.includes('admin')) {
        fail(res, 403, 'forbidden', 'Admin access required');
        return;
    }
    next();
}

function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.currentUser) {
            fail(res, 401, 'unauthenticated', 'Authentication required');
            return;
        }
        if (req.userRoles.includes('admin') || req.permissions.has(permission)) {
            next();
            return;
        }
        fail(res, 403, 'forbidden', 'Permission denied');
    };
}

function issueCsrfToken(req) {
    if (!req.session) return null;
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    return req.session.csrfToken;
}

function csrfProtection(req, res, next) {
    if (SAFE_METHODS.has(req.method) || CSRF_EXEMPT.includes(req.path)) {
        issueCsrfToken(req);
        next();
        return;
    }
    if (!req.currentUser) {
        next();
        return;
    }
    const expected = issueCsrfToken(req);
    const supplied = req.headers['x-csrf-token'] || req.body && req.body.csrfToken;
    const expectedBuffer = Buffer.from(String(expected || ''));
    const suppliedBuffer = Buffer.from(String(supplied || ''));
    if (
        !expected ||
        !supplied ||
        expectedBuffer.length !== suppliedBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)
    ) {
        fail(res, 403, 'csrf_invalid', 'Security token is invalid or missing');
        return;
    }
    next();
}

function ensureOwnsUserParam(paramName) {
    return (req, res, next) => {
        const id = req.params[paramName || 'id'];
        if (req.userRoles && req.userRoles.includes('admin')) return next();
        if (String(id) !== String(req.userId)) {
            next(httpError(403, 'forbidden', 'You do not have access to this record'));
            return;
        }
        next();
    };
}

module.exports = {
    attachCurrentUser,
    requireAuth,
    requireAdmin,
    requirePermission,
    issueCsrfToken,
    csrfProtection,
    ensureOwnsUserParam,
    publicUser
};
