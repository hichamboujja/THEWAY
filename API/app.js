const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const pinoHttp = require('pino-http');

const config = require('./lib/config');
const logger = require('./lib/logger');
const db = require('./lib/db');
const MySQLSessionStore = require('./lib/sessionStore');
const { requestIdMiddleware, fail, notFound, errorHandler } = require('./lib/response');
const { attachCurrentUser, csrfProtection, requireAuth } = require('./middleware/auth');
const createProductionRouter = require('./routes/production');

const createAdminDashboardRouter = require('./routes/admin/dashboard');
const createAdminUsersRouter = require('./routes/admin/users');
const createAdminEnterprisesRouter = require('./routes/admin/enterprises');
const createAdminOffersRouter = require('./routes/admin/offers');
const createAdminMatchingRouter = require('./routes/admin/matching');
const createAdminSkillsRouter = require('./routes/admin/skills');
const createAdminAnalyticsRouter = require('./routes/admin/analytics');
const createAdminSubscriptionsRouter = require('./routes/admin/subscriptions');
const createAdminSupportRouter = require('./routes/admin/support');
const createAdminSettingsRouter = require('./routes/admin/settings');
const createAdminNotificationsRouter = require('./routes/admin/notifications');

function createApp() {
    const app = express();
    const pool = db.createPool();
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: config.uploads.maxFileSize }
    });

    if (config.isProduction) app.set('trust proxy', 1);

    app.use(requestIdMiddleware);
    app.use(pinoHttp({
        logger,
        genReqId: req => req.requestId,
        customProps: req => ({ requestId: req.requestId })
    }));
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
    }));
    app.use(cors({
        origin(origin, callback) {
            if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
            callback(new Error('Origin not allowed by CORS'));
        },
        credentials: true
    }));
    app.use(cookieParser(config.cookies.secret));
    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ limit: '2mb', extended: true }));
    app.use(rejectUnsupportedContentTypes);
    app.use(session({
        name: 'theway.sid',
        secret: config.cookies.secret,
        store: new MySQLSessionStore({ pool, ttlMs: config.cookies.ttlMs }),
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
            httpOnly: true,
            secure: config.cookies.secure,
            sameSite: config.cookies.sameSite,
            maxAge: config.cookies.ttlMs
        }
    }));
    app.use(attachCurrentUser(db.getConnection));
    app.use(csrfProtection);

    const rootDir = config.rootDir;
    const viewDir = path.join(rootDir, 'view');
    app.use('/assets', express.static(path.join(rootDir, 'assets'), { maxAge: config.isProduction ? '7d' : 0 }));
    app.use('/view', express.static(viewDir, { maxAge: config.isProduction ? '1h' : 0 }));

    app.get('/', (req, res) => res.sendFile(path.join(viewDir, 'public', 'index.html')));
    app.get('/authentification.html', (req, res) => res.redirect('/view/authentification/login.html'));

    app.get('/health', liveHealth);
    app.get('/health/live', liveHealth);
    app.get('/health/ready', async (req, res, next) => {
        try {
            await db.ping();
            res.json({ ok: true, status: 'ready', requestId: req.requestId });
        } catch (error) {
            next(error);
        }
    });

    const routeDeps = {
        getConnection: db.getConnection,
        verifyToken: requireAuth,
        upload,
        rootDir
    };

    app.use(createProductionRouter(routeDeps));
    app.use(createAdminDashboardRouter(routeDeps));
    app.use(createAdminUsersRouter(routeDeps));
    app.use(createAdminEnterprisesRouter(routeDeps));
    app.use(createAdminOffersRouter(routeDeps));
    app.use(createAdminMatchingRouter(routeDeps));
    app.use(createAdminSkillsRouter(routeDeps));
    app.use(createAdminAnalyticsRouter(routeDeps));
    app.use(createAdminSubscriptionsRouter(routeDeps));
    app.use(createAdminSupportRouter(routeDeps));
    app.use(createAdminSettingsRouter(routeDeps));
    app.use(createAdminNotificationsRouter(routeDeps));

    app.use(notFound);
    app.use(errorHandler);

    return app;
}

function liveHealth(req, res) {
    res.json({ ok: true, status: 'live', requestId: req.requestId });
}

function rejectUnsupportedContentTypes(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const type = req.headers['content-type'] || '';
    if (!type || type.includes('application/json') || type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
        return next();
    }
    fail(res, 415, 'unsupported_media_type', 'Unsupported content type');
}

module.exports = {
    createApp
};
