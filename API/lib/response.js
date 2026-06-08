const crypto = require('crypto');
const logger = require('./logger');

function requestIdMiddleware(req, res, next) {
    req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
}

function ok(res, data, status) {
    const payload = Object.assign({
        ok: true,
        data: data === undefined ? null : data,
        requestId: res.req.requestId
    }, compatibility(data));
    res.status(status || 200).json(payload);
}

function created(res, data) {
    ok(res, data, 201);
}

function compatibility(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    const passthrough = {};
    ['user', 'profile', 'skills', 'opportunities', 'summary', 'users', 'token', 'message', 'pagination'].forEach(key => {
        if (Object.prototype.hasOwnProperty.call(data, key)) passthrough[key] = data[key];
    });
    return passthrough;
}

function fail(res, status, code, message, details) {
    res.status(status).json({
        ok: false,
        error: {
            code,
            message,
            details: details || null
        },
        message,
        requestId: res.req.requestId
    });
}

function httpError(status, code, message, details) {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    error.details = details;
    error.publicMessage = message;
    return error;
}

function asyncRoute(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

function notFound(req, res) {
    fail(res, 404, 'not_found', 'Route not found');
}

function methodNotAllowed(methods) {
    return (req, res) => {
        res.setHeader('Allow', methods.join(', '));
        fail(res, 405, 'method_not_allowed', 'Method not allowed');
    };
}

function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        next(err);
        return;
    }
    const status = err.status || 500;
    if (status >= 500) {
        logger.error({ err, requestId: req.requestId }, 'Unhandled request error');
    } else {
        logger.warn({ err: { message: err.message, code: err.code }, requestId: req.requestId }, 'Request rejected');
    }
    fail(
        res,
        status,
        err.code || (status >= 500 ? 'internal_error' : 'request_error'),
        status >= 500 ? 'Internal server error' : (err.publicMessage || err.message || 'Request failed'),
        err.details
    );
}

module.exports = {
    requestIdMiddleware,
    ok,
    created,
    fail,
    httpError,
    asyncRoute,
    notFound,
    methodNotAllowed,
    errorHandler
};
