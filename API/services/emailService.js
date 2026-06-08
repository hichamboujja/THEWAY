const crypto = require('crypto');
const nodemailer = require('nodemailer');
const config = require('../lib/config');

function isConfigured() {
    return Boolean(config.mail.smtp.host);
}

function createTransport() {
    if (!isConfigured()) return null;
    return nodemailer.createTransport({
        host: config.mail.smtp.host,
        port: config.mail.smtp.port,
        secure: config.mail.smtp.port === 465,
        auth: config.mail.smtp.user ? {
            user: config.mail.smtp.user,
            pass: config.mail.smtp.password
        } : undefined
    });
}

async function sendEmail(getConnection, message) {
    const id = crypto.randomUUID();
    const provider = isConfigured() ? config.mail.provider : 'local';
    await insertEmail(getConnection, {
        id,
        id_user: message.userId || null,
        recipient: message.to,
        subject: message.subject,
        template: message.template || null,
        provider,
        status: 'queued'
    });

    if (!isConfigured()) {
        if (config.isProduction) {
            await markEmail(getConnection, id, 'failed', null, 'SMTP provider is not configured');
            throw new Error('SMTP provider is not configured');
        }
        await markEmail(getConnection, id, 'skipped_local', null, null);
        return { id, skipped: true };
    }

    try {
        const transport = createTransport();
        const result = await transport.sendMail({
            from: config.mail.from,
            to: message.to,
            subject: message.subject,
            text: message.text,
            html: message.html
        });
        await markEmail(getConnection, id, 'sent', result.messageId || null, null);
        return { id, messageId: result.messageId };
    } catch (error) {
        await markEmail(getConnection, id, 'failed', null, error.message);
        throw error;
    }
}

function passwordResetEmail(email, resetUrl) {
    return {
        to: email,
        subject: 'Reset your THEWAY password',
        template: 'password_reset',
        text: [
            'A password reset was requested for your THEWAY account.',
            '',
            `Reset link: ${resetUrl}`,
            '',
            'If you did not request this, you can ignore this email.'
        ].join('\n'),
        html: [
            '<p>A password reset was requested for your THEWAY account.</p>',
            `<p><a href="${escapeHTML(resetUrl)}">Reset your password</a></p>`,
            '<p>If you did not request this, you can ignore this email.</p>'
        ].join('')
    };
}

async function insertEmail(getConnection, email) {
    const connection = await getConnection();
    try {
        await connection.execute(
            `INSERT INTO outbound_email
             (id_email, id_user, recipient, subject, template, provider, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [email.id, email.id_user, email.recipient, email.subject, email.template, email.provider, email.status]
        );
    } finally {
        connection.release();
    }
}

async function markEmail(getConnection, id, status, providerMessageId, errorMessage) {
    const connection = await getConnection();
    try {
        await connection.execute(
            `UPDATE outbound_email
             SET status = ?, provider_message_id = ?, error_message = ?, sent_at = CASE WHEN ? = 'sent' THEN UTC_TIMESTAMP() ELSE sent_at END
             WHERE id_email = ?`,
            [status, providerMessageId, errorMessage, status, id]
        );
    } finally {
        connection.release();
    }
}

function escapeHTML(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

module.exports = {
    sendEmail,
    passwordResetEmail,
    isConfigured
};
