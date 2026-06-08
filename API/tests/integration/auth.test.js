const request = require('supertest');
const { createApp } = require('../../app');
const db = require('../../lib/db');

const describeWithDb = process.env.DB_USER ? describe : describe.skip;

describeWithDb('auth/session integration', () => {
    let app;
    let agent;

    beforeAll(async () => {
        app = createApp();
        agent = request.agent(app);
        await db.ping();
    });

    afterAll(async () => {
        await db.close();
    });

    test('registers, keeps an HttpOnly session, and reads profile', async () => {
        const email = `test-${Date.now()}@example.com`;
        const register = await agent
            .post('/api/auth/register')
            .send({
                nom: 'Tester',
                prenom: 'Taylor',
                email,
                password: 'CorrectHorse123!'
            })
            .expect(201);

        expect(register.body.ok).toBe(true);
        expect(register.headers['set-cookie'].join(';')).toContain('theway.sid');
        expect(register.body.data.user.email).toBe(email);

        const session = await agent.get('/api/auth/session').expect(200);
        expect(session.body.data.authenticated).toBe(true);
        expect(session.body.data.csrfToken).toBeTruthy();

        const profile = await agent.get('/api/profile').expect(200);
        expect(profile.body.data.profile.email).toBe(email);
    });
});
