const crypto = require('crypto');

async function audit(getConnection, req, action, entityType, entityId, metadata) {
    let connection;
    try {
        connection = await getConnection();
        await connection.execute(
            `INSERT INTO audit_log
             (id_audit, actor_user_id, action, entity_type, entity_id, metadata, ip_address, user_agent, request_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                crypto.randomUUID(),
                req.userId || null,
                action,
                entityType || null,
                entityId || null,
                JSON.stringify(metadata || {}),
                req.ip || null,
                req.headers['user-agent'] || null,
                req.requestId || null
            ]
        );
    } catch (error) {
        req.log && req.log.warn({ err: error }, 'Audit log write failed');
    } finally {
        if (connection) connection.release();
    }
}

module.exports = {
    audit
};
