const fs = require('fs').promises;
const path = require('path');

async function ensureMigrationTable(connection) {
    await connection.execute(
        `CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(191) PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
}

async function appliedVersions(connection) {
    await ensureMigrationTable(connection);
    const [rows] = await connection.execute('SELECT version FROM schema_migrations');
    return new Set(rows.map(row => row.version));
}

async function runMigrations(connection, migrationsDir) {
    const files = (await fs.readdir(migrationsDir))
        .filter(file => file.endsWith('.sql'))
        .sort();
    const applied = await appliedVersions(connection);
    const executed = [];

    for (const file of files) {
        if (applied.has(file)) continue;
        const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
        const statements = splitSql(sql);
        await connection.beginTransaction();
        try {
            for (const statement of statements) {
                await connection.query(statement);
            }
            await connection.execute('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
            await connection.commit();
            executed.push(file);
        } catch (error) {
            await connection.rollback();
            throw error;
        }
    }

    return executed;
}

function splitSql(sql) {
    return sql
        .split(/\r?\n/)
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .split(/;\s*(?:\r?\n|$)/)
        .map(statement => statement.trim())
        .filter(Boolean);
}

module.exports = {
    runMigrations,
    splitSql
};
