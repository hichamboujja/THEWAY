#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');
const config = require('../lib/config');
const db = require('../lib/db');
const logger = require('../lib/logger');
const { runMigrations, splitSql } = require('../lib/migrations');

async function runBaseSchema(connection) {
    const baseSchema = path.join(config.rootDir, 'database', 'database.sql');
    const sql = await fs.readFile(baseSchema, 'utf8');
    const statements = splitSql(sql).filter(statement => !/^CREATE DATABASE/i.test(statement) && !/^USE\s+/i.test(statement));
    for (const statement of statements) {
        try {
            await connection.query(statement);
        } catch (error) {
            if (error.code !== 'ER_TABLE_EXISTS_ERROR' && error.code !== 'ER_DUP_KEYNAME') throw error;
        }
    }
}

async function main() {
    const connection = await db.getConnection();
    try {
        await runBaseSchema(connection);
        const executed = await runMigrations(connection, path.join(config.rootDir, 'database', 'migrations'));
        logger.info({ executed }, 'Database migrations complete');
    } finally {
        connection.release();
        await db.close();
    }
}

main().catch(error => {
    logger.error({ err: error }, 'Database migration failed');
    process.exit(1);
});
