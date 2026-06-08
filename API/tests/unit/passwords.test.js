const { hashPassword, verifyPassword, isArgonHash } = require('../../lib/passwords');

describe('password hashing', () => {
    test('hashes and verifies passwords with Argon2id', async () => {
        const hash = await hashPassword('correct horse battery staple');
        expect(isArgonHash(hash)).toBe(true);
        await expect(verifyPassword(hash, 'correct horse battery staple')).resolves.toBe(true);
        await expect(verifyPassword(hash, 'wrong password')).resolves.toBe(false);
    });
});
