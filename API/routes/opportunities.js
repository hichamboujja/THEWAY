const express = require('express');
const fs = require('fs').promises;
const path = require('path');

module.exports = function createOpportunitiesRouter(deps) {
    const router = express.Router();
    deps = deps || {};
    const { getConnection } = deps;
    const opportunitiesFilePath = deps.opportunitiesFilePath || path.join(__dirname, '..', '..', 'assets', 'uploads', 'files', 'opportunities.json');
    const cache = {
        mtimeMs: null,
        opportunities: []
    };

    router.get('/api/opportunities', async (req, res) => {
        if (getConnection) {
            try {
                const opportunities = await listDatabaseOpportunities(getConnection);
                return res.json({
                    ok: true,
                    mode: 'database',
                    opportunities: opportunities
                });
            } catch (error) {
                console.error('Database opportunities unavailable:', error.message);
            }
        }

        try {
            const opportunities = await listFileOpportunities(opportunitiesFilePath, cache);
            res.json({
                ok: true,
                mode: 'file',
                opportunities: opportunities
            });
        } catch (error) {
            console.error('Opportunities error:', error);
            res.status(500).json({ ok: false, error: 'Erreur opportunités' });
        }
    });

    return router;
};

async function listDatabaseOpportunities(getConnection) {
    const connection = await getConnection();
    try {
        const [rows] = await connection.execute(
            'SELECT id, uid, source, title, company, location, source_url, description, skills FROM opportunities ORDER BY created_at DESC, id DESC LIMIT 1000'
        );

        return rows.map(row => ({
            id: row.id,
            uid: row.uid,
            source: row.source,
            title: row.title,
            company: row.company,
            location: row.location,
            source_url: row.source_url,
            description: row.description,
            skills: normalizeSkills(row.skills)
        }));
    } finally {
        connection.release();
    }
}

async function listFileOpportunities(opportunitiesFilePath, cache) {
    const stat = await fs.stat(opportunitiesFilePath).catch(error => {
        if (error.code === 'ENOENT') return null;
        throw error;
    });
    if (!stat) {
        cache.mtimeMs = null;
        cache.opportunities = [];
        return cache.opportunities;
    }
    if (cache.mtimeMs !== stat.mtimeMs) {
        const data = await fs.readFile(opportunitiesFilePath, 'utf8');
        cache.opportunities = JSON.parse(data);
        cache.mtimeMs = stat.mtimeMs;
    }
    return cache.opportunities;
}

function normalizeSkills(skills) {
    if (Array.isArray(skills)) return skills;
    if (!skills) return [];

    const value = String(skills).trim();
    if (!value) return [];
    if (value.startsWith('[')) {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }
    return value
        .split(',')
        .map(skill => skill.trim())
        .filter(Boolean);
}
