const crypto = require('crypto');

function id() {
    return crypto.randomUUID();
}

function intParam(value, fallback, min, max) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
}

function pagination(query) {
    const page = intParam(query.page, 1, 1, 100000);
    const limit = intParam(query.limit, 10, 1, 100);
    return {
        page,
        limit,
        offset: (page - 1) * limit
    };
}

function normalizeLike(value) {
    return '%' + String(value || '').trim() + '%';
}

async function withConnection(getConnection, work) {
    const connection = await getConnection();
    try {
        return await work(connection);
    } finally {
        connection.release();
    }
}

async function tableExists(connection, tableName) {
    const [rows] = await connection.execute('SHOW TABLES LIKE ?', [tableName]);
    return rows.length > 0;
}

async function ensureAdminTables(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS abonnement (
            id_abonnement CHAR(36) PRIMARY KEY,
            id_entreprise CHAR(36),
            plan VARCHAR(100) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            start_date DATE,
            end_date DATE,
            price DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_abonnement_entreprise
                FOREIGN KEY (id_entreprise)
                REFERENCES entreprise(id_entreprise)
                ON DELETE SET NULL
                ON UPDATE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await connection.execute(`
        CREATE TABLE IF NOT EXISTS support_ticket (
            id_ticket CHAR(36) PRIMARY KEY,
            id_user CHAR(36),
            subject VARCHAR(255) NOT NULL,
            message TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'open',
            priority VARCHAR(50) NOT NULL DEFAULT 'normal',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_support_ticket_user
                FOREIGN KEY (id_user)
                REFERENCES utilisateur(id_user)
                ON DELETE SET NULL
                ON UPDATE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
}

function parseSkills(value) {
    if (Array.isArray(value)) return value;
    const raw = String(value || '').trim();
    if (!raw) return [];
    if (raw.startsWith('[')) {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }
    return raw.split(',').map(item => item.trim()).filter(Boolean);
}

function skillString(value) {
    return parseSkills(value).join(', ');
}

function normalizeKey(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function categoryForSkill(name) {
    const key = normalizeKey(name);
    if (/(react|vue|angular|html|css|figma|ui|ux|javascript|typescript)/.test(key)) return 'Frontend';
    if (/(node|express|php|laravel|django|flask|spring|api|sql|mysql|postgres|java|python)/.test(key)) return 'Backend';
    if (/(docker|kubernetes|aws|azure|cloud|devops|linux|ci\/cd|git)/.test(key)) return 'DevOps';
    if (/(data|ia|ai|machine learning|power bi|excel|tableau)/.test(key)) return 'Data';
    if (/(rh|recrutement|formation|paie|ressources humaines)/.test(key)) return 'RH';
    if (/(vente|commercial|marketing|seo|crm|b2b|sales)/.test(key)) return 'Business';
    return 'General';
}

async function demandedSkills(connection) {
    const counts = new Map();
    const collect = rows => {
        rows.forEach(row => {
            parseSkills(row.skills).forEach(skill => {
                const key = normalizeKey(skill);
                if (!key) return;
                const current = counts.get(key) || { name: skill, demand_count: 0 };
                current.demand_count += 1;
                counts.set(key, current);
            });
        });
    };

    const [opportunities] = await connection.execute(
        'SELECT skills FROM opportunities WHERE skills IS NOT NULL AND skills <> "" LIMIT 5000'
    );
    collect(opportunities);

    const [offers] = await connection.execute(
        'SELECT skills FROM offre WHERE skills IS NOT NULL AND skills <> "" LIMIT 5000'
    );
    collect(offers);

    return counts;
}

function respondError(res, error, fallback) {
    console.error(fallback + ':', error);
    res.status(error.status || 500).json({ ok: false, error: error.publicMessage || fallback });
}

function httpError(status, message) {
    const error = new Error(message);
    error.status = status;
    error.publicMessage = message;
    return error;
}

module.exports = {
    id,
    pagination,
    normalizeLike,
    withConnection,
    tableExists,
    ensureAdminTables,
    parseSkills,
    skillString,
    normalizeKey,
    categoryForSkill,
    demandedSkills,
    respondError,
    httpError
};
