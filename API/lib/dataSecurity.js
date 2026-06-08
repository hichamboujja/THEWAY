const crypto = require('crypto');
const { hashPassword } = require('./passwords');

function encryptionKey() {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is required for encrypted local storage.');
    }
    return crypto.createHash('sha256').update(process.env.JWT_SECRET).digest();
}

function encryptText(value) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
    const encrypted = Buffer.concat([
        cipher.update(String(value), 'utf8'),
        cipher.final()
    ]);
    return JSON.stringify({
        version: 1,
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64'),
        data: encrypted.toString('base64')
    });
}

function decryptText(raw) {
    const payload = JSON.parse(raw);
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        encryptionKey(),
        Buffer.from(payload.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(payload.data, 'base64')),
        decipher.final()
    ]);
    return decrypted.toString('utf8');
}

function randomId() {
    return Date.now() + '-' + crypto.randomBytes(4).toString('hex');
}

module.exports = {
    encryptText,
    decryptText,
    randomId,
    hashPassword
};
