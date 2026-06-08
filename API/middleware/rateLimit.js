const { fail } = require('../lib/response');

function dbRateLimit(getConnection, name, options) {
    const windowMs = options.windowMs;
    const max = options.max;

    return async (req, res, next) => {
        const actor = req.userId || req.ip || 'anonymous';
        const bucketKey = `${name}:${actor}`;
        const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
        let connection;
        try {
            connection = await getConnection();
            await connection.execute(
                `INSERT INTO rate_limit_bucket (bucket_key, window_start, request_count)
                 VALUES (?, ?, 1)
                 ON DUPLICATE KEY UPDATE request_count = request_count + 1`,
                [bucketKey, windowStart]
            );
            const [[bucket]] = await connection.execute(
                'SELECT request_count FROM rate_limit_bucket WHERE bucket_key = ? AND window_start = ?',
                [bucketKey, windowStart]
            );
            if (Number(bucket.request_count) > max) {
                fail(res, 429, 'rate_limited', 'Too many requests, please try again later');
                return;
            }
            next();
        } catch (error) {
            next(error);
        } finally {
            if (connection) connection.release();
        }
    };
}

module.exports = {
    dbRateLimit
};
