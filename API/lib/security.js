const jwt = require('jsonwebtoken');

const DEFAULT_CORS_ORIGINS = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
];

function requiredSecret() {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is required. Set it before starting the API server.');
    }
    return process.env.JWT_SECRET;
}

const JWT_SECRET = requiredSecret();

function configuredCorsOrigins() {
    const raw = process.env.CORS_ORIGIN || '';
    if (!raw && process.env.NODE_ENV === 'production') {
        throw new Error('CORS_ORIGIN environment variable is required in production.');
    }
    return raw
        ? raw.split(',').map(origin => origin.trim()).filter(Boolean)
        : DEFAULT_CORS_ORIGINS;
}

const allowedOrigins = configuredCorsOrigins();

function corsOrigin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
    }
    callback(new Error('Origin not allowed by CORS'));
}

function signUserToken(user) {
    const userId = user.id_user || user.id;
    return jwt.sign(
        { id_user: userId, email: user.email, role: user.role || 'user' },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );
}

function verifyTokenValue(token) {
    try {
        return {
            ok: true,
            decoded: jwt.verify(String(token || '').replace('Bearer ', ''), JWT_SECRET)
        };
    } catch (error) {
        return {
            ok: false,
            error: error
        };
    }
}

module.exports = {
    allowedOrigins,
    corsOrigin,
    signUserToken,
    verifyTokenValue
};
