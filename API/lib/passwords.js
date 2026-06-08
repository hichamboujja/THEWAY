const argon2 = require('argon2');

async function hashPassword(password) {
    return argon2.hash(String(password), {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 3,
        parallelism: 1
    });
}

async function verifyPassword(hash, password) {
    if (!hash || !String(hash).startsWith('$argon2')) return false;
    return argon2.verify(hash, String(password));
}

function isArgonHash(hash) {
    return Boolean(hash && String(hash).startsWith('$argon2'));
}

module.exports = {
    hashPassword,
    verifyPassword,
    isArgonHash
};
