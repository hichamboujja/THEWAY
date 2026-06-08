const mysql = require('mysql2/promise');
const config = require('./config');
const logger = require('./logger');

let pool;

function createPool() {
    if (pool) return pool;
    pool = mysql.createPool({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        ssl: config.db.ssl,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        namedPlaceholders: false,
        multipleStatements: false
    });
    return pool;
}

async function getConnection() {
    return createPool().getConnection();
}

async function withConnection(work) {
    const connection = await getConnection();
    try {
        return await work(connection);
    } finally {
        connection.release();
    }
}

async function ping() {
    return withConnection(async connection => {
        await connection.ping();
        return true;
    });
}

async function close() {
    if (!pool) return;
    await pool.end();
    pool = null;
    logger.info('MySQL pool closed');
}

module.exports = {
    createPool,
    getConnection,
    withConnection,
    ping,
    close
};
