const session = require('express-session');

class MySQLSessionStore extends session.Store {
    constructor(options) {
        super();
        this.pool = options.pool;
        this.ttlMs = options.ttlMs;
    }

    get(sid, callback) {
        this.pool.execute(
            'SELECT sess FROM auth_sessions WHERE sid = ? AND expires_at > UTC_TIMESTAMP() LIMIT 1',
            [sid]
        ).then(([rows]) => {
            if (!rows.length) return callback(null, null);
            try {
                callback(null, JSON.parse(rows[0].sess));
            } catch (error) {
                callback(error);
            }
        }).catch(callback);
    }

    set(sid, sess, callback) {
        const expiresAt = expiresFromSession(sess, this.ttlMs);
        const userId = sess.userId || (sess.user && sess.user.id) || null;
        this.pool.execute(
            `INSERT INTO auth_sessions (sid, sess, expires_at, id_user, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE sess = VALUES(sess), expires_at = VALUES(expires_at),
                id_user = VALUES(id_user), ip_address = VALUES(ip_address),
                user_agent = VALUES(user_agent), updated_at = CURRENT_TIMESTAMP`,
            [
                sid,
                JSON.stringify(sess),
                expiresAt,
                userId,
                sess.ipAddress || null,
                sess.userAgent || null
            ]
        ).then(() => callback && callback()).catch(callback);
    }

    destroy(sid, callback) {
        this.pool.execute('DELETE FROM auth_sessions WHERE sid = ?', [sid])
            .then(() => callback && callback())
            .catch(callback);
    }

    touch(sid, sess, callback) {
        const expiresAt = expiresFromSession(sess, this.ttlMs);
        this.pool.execute(
            'UPDATE auth_sessions SET expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE sid = ?',
            [expiresAt, sid]
        ).then(() => callback && callback()).catch(callback);
    }

    clearExpired() {
        return this.pool.execute('DELETE FROM auth_sessions WHERE expires_at <= UTC_TIMESTAMP()');
    }
}

function expiresFromSession(sess, ttlMs) {
    const cookieExpires = sess && sess.cookie && sess.cookie.expires;
    const date = cookieExpires ? new Date(cookieExpires) : new Date(Date.now() + ttlMs);
    return Number.isNaN(date.getTime()) ? new Date(Date.now() + ttlMs) : date;
}

module.exports = MySQLSessionStore;
