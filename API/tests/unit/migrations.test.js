const { splitSql } = require('../../lib/migrations');

describe('migration SQL splitter', () => {
    test('removes comments and keeps executable statements', () => {
        const statements = splitSql(`
            -- comment
            CREATE TABLE example (id INT);
            -- another comment
            INSERT INTO example (id) VALUES (1);
        `);
        expect(statements).toEqual([
            'CREATE TABLE example (id INT)',
            'INSERT INTO example (id) VALUES (1)'
        ]);
    });
});
