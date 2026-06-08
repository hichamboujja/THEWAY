const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

const apiDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(apiDir, '..');

dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(apiDir, '.env'), override: true });

const DEFAULT_LOCAL_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
];

function splitCSV(value, fallback) {
    const items = String(value || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    return items.length ? items : fallback;
}

function intEnv(name, fallback, min, max) {
    const parsed = parseInt(process.env[name], 10);
    const value = Number.isFinite(parsed) ? parsed : fallback;
    return Math.min(Math.max(value, min), max);
}

function boolEnv(name, fallback) {
    if (process.env[name] === undefined) return fallback;
    return ['1', 'true', 'yes', 'on'].includes(String(process.env[name]).toLowerCase());
}

function emptyToUndefined(schema) {
    return z.preprocess(value => value === '' ? undefined : value, schema.optional());
}

function required(name, value, productionOnly) {
    if (productionOnly && process.env.NODE_ENV !== 'production') return;
    if (value === undefined || value === null || String(value) === '') {
        throw new Error(`${name} environment variable is required${productionOnly ? ' in production' : ''}.`);
    }
}

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string().default(''),
    DB_NAME: z.string().default('theway'),
    DB_SSL: z.string().optional(),
    APP_BASE_URL: emptyToUndefined(z.string().url()),
    CLIENT_BASE_URL: emptyToUndefined(z.string().url()),
    COOKIE_SECRET: emptyToUndefined(z.string()),
    CSRF_SECRET: emptyToUndefined(z.string()),
    CORS_ORIGIN: emptyToUndefined(z.string()),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
    MAX_FILE_SIZE: z.coerce.number().int().min(1024).default(20 * 1024 * 1024),
    LOCAL_UPLOAD_DIR: emptyToUndefined(z.string()),
    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    S3_ENDPOINT: emptyToUndefined(z.string()),
    S3_BUCKET: emptyToUndefined(z.string()),
    S3_REGION: emptyToUndefined(z.string()),
    S3_ACCESS_KEY_ID: emptyToUndefined(z.string()),
    S3_SECRET_ACCESS_KEY: emptyToUndefined(z.string()),
    AI_PROVIDER: emptyToUndefined(z.string()),
    AI_API_KEY: emptyToUndefined(z.string()),
    AI_BASE_URL: emptyToUndefined(z.string().url()),
    AI_MODEL: emptyToUndefined(z.string()),
    MAIL_PROVIDER: emptyToUndefined(z.string()),
    MAIL_FROM: emptyToUndefined(z.string()),
    SMTP_HOST: emptyToUndefined(z.string()),
    SMTP_PORT: emptyToUndefined(z.coerce.number().int().min(1).max(65535)),
    SMTP_USER: emptyToUndefined(z.string()),
    SMTP_PASSWORD: emptyToUndefined(z.string()),
    OAUTH_GOOGLE_CLIENT_ID: emptyToUndefined(z.string()),
    OAUTH_GOOGLE_CLIENT_SECRET: emptyToUndefined(z.string()),
    OAUTH_LINKEDIN_CLIENT_ID: emptyToUndefined(z.string()),
    OAUTH_LINKEDIN_CLIENT_SECRET: emptyToUndefined(z.string()),
    BOOTSTRAP_ADMIN_EMAIL: emptyToUndefined(z.string().email()),
    BOOTSTRAP_ADMIN_PASSWORD: emptyToUndefined(z.string()),
    OTEL_SERVICE_NAME: z.string().default('theway-api'),
    OTEL_EXPORTER_OTLP_ENDPOINT: emptyToUndefined(z.string()),
    LOG_LEVEL: z.string().default('info')
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    const message = parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${message}`);
}

const env = parsed.data;
const isProduction = env.NODE_ENV === 'production';

required('DB_USER', env.DB_USER, false);
required('DB_PASSWORD', env.DB_PASSWORD, true);
required('COOKIE_SECRET', env.COOKIE_SECRET, true);
required('CSRF_SECRET', env.CSRF_SECRET, true);
required('CORS_ORIGIN', env.CORS_ORIGIN, true);
required('APP_BASE_URL', env.APP_BASE_URL, true);
required('CLIENT_BASE_URL', env.CLIENT_BASE_URL, true);

if (isProduction && env.STORAGE_DRIVER === 's3') {
    ['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'].forEach(name => required(name, env[name], false));
}

const appBaseUrl = env.APP_BASE_URL || `http://localhost:${env.PORT}`;
const clientBaseUrl = env.CLIENT_BASE_URL || appBaseUrl;
const corsOrigins = splitCSV(env.CORS_ORIGIN, DEFAULT_LOCAL_ORIGINS);

module.exports = {
    apiDir,
    rootDir,
    nodeEnv: env.NODE_ENV,
    isProduction,
    port: env.PORT,
    appBaseUrl,
    clientBaseUrl,
    db: {
        host: env.DB_HOST,
        port: env.DB_PORT,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        ssl: boolEnv('DB_SSL', false) ? { rejectUnauthorized: true } : undefined
    },
    corsOrigins,
    cookies: {
        secret: env.COOKIE_SECRET || 'development-cookie-secret-change-me',
        secure: isProduction,
        sameSite: isProduction ? 'lax' : 'lax',
        ttlMs: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
    },
    csrf: {
        secret: env.CSRF_SECRET || 'development-csrf-secret-change-me'
    },
    rateLimits: {
        auth: { windowMs: 15 * 60 * 1000, max: intEnv('RATE_LIMIT_AUTH_MAX', 20, 1, 1000) },
        reset: { windowMs: 60 * 60 * 1000, max: intEnv('RATE_LIMIT_RESET_MAX', 5, 1, 1000) },
        upload: { windowMs: 60 * 60 * 1000, max: intEnv('RATE_LIMIT_UPLOAD_MAX', 20, 1, 1000) },
        ai: { windowMs: 60 * 60 * 1000, max: intEnv('RATE_LIMIT_AI_MAX', 10, 1, 1000) },
        admin: { windowMs: 60 * 1000, max: intEnv('RATE_LIMIT_ADMIN_MAX', 120, 1, 10000) }
    },
    uploads: {
        driver: env.STORAGE_DRIVER,
        localDir: path.resolve(rootDir, env.LOCAL_UPLOAD_DIR || 'storage/uploads'),
        maxFileSize: env.MAX_FILE_SIZE,
        allowedExtensions: ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp', '.csv', '.txt']
    },
    s3: {
        endpoint: env.S3_ENDPOINT,
        bucket: env.S3_BUCKET,
        region: env.S3_REGION || 'us-east-1',
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY
    },
    ai: {
        provider: env.AI_PROVIDER || '',
        apiKey: env.AI_API_KEY || '',
        baseUrl: env.AI_BASE_URL || '',
        model: env.AI_MODEL || ''
    },
    mail: {
        provider: env.MAIL_PROVIDER || 'smtp',
        from: env.MAIL_FROM || 'no-reply@theway.local',
        smtp: {
            host: env.SMTP_HOST,
            port: env.SMTP_PORT || 587,
            user: env.SMTP_USER,
            password: env.SMTP_PASSWORD
        }
    },
    oauth: {
        google: {
            clientId: env.OAUTH_GOOGLE_CLIENT_ID,
            clientSecret: env.OAUTH_GOOGLE_CLIENT_SECRET
        },
        linkedin: {
            clientId: env.OAUTH_LINKEDIN_CLIENT_ID,
            clientSecret: env.OAUTH_LINKEDIN_CLIENT_SECRET
        }
    },
    bootstrapAdmin: {
        email: env.BOOTSTRAP_ADMIN_EMAIL,
        password: env.BOOTSTRAP_ADMIN_PASSWORD
    },
    otel: {
        serviceName: env.OTEL_SERVICE_NAME,
        endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT
    },
    logLevel: env.LOG_LEVEL
};
