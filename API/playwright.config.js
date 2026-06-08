module.exports = {
    testDir: './tests/e2e',
    timeout: 30000,
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3001',
        trace: 'retain-on-failure'
    }
};
