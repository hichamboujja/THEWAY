const express = require('express');
const requireAdmin = require('../../middleware/requireAdmin');
const { withConnection, respondError, demandedSkills } = require('./helpers');

module.exports = function createAdminAnalyticsRouter(deps) {
    const router = express.Router();
    const { getConnection, verifyToken } = deps;

    router.get('/api/admin/analytics', verifyToken, requireAdmin, async (req, res) => {
        try {
            const data = await withConnection(getConnection, async connection => {
                const [usersByRole] = await connection.execute('SELECT role AS label, COUNT(*) AS value FROM utilisateur GROUP BY role ORDER BY value DESC');
                const [offersByLocation] = await connection.execute(`
                    SELECT location AS label, COUNT(*) AS value
                    FROM (
                        SELECT localisation AS location FROM offre
                        UNION ALL
                        SELECT location FROM opportunities
                    ) merged
                    WHERE location IS NOT NULL AND location <> ''
                    GROUP BY location
                    ORDER BY value DESC
                    LIMIT 12
                `);
                const [offersBySource] = await connection.execute(`
                    SELECT source AS label, COUNT(*) AS value
                    FROM (
                        SELECT source FROM offre
                        UNION ALL
                        SELECT source FROM opportunities
                    ) merged
                    WHERE source IS NOT NULL AND source <> ''
                    GROUP BY source
                    ORDER BY value DESC
                    LIMIT 12
                `);
                const [opportunitiesBySource] = await connection.execute('SELECT source AS label, COUNT(*) AS value FROM opportunities WHERE source IS NOT NULL GROUP BY source ORDER BY value DESC LIMIT 12');
                const [matchingDistribution] = await connection.execute(`
                    SELECT
                        CASE
                            WHEN score >= 80 THEN '80-100'
                            WHEN score >= 60 THEN '60-79'
                            WHEN score >= 40 THEN '40-59'
                            ELSE '0-39'
                        END AS label,
                        COUNT(*) AS value
                    FROM matching
                    GROUP BY label
                    ORDER BY label DESC
                `);
                const [cvUploads] = await connection.execute(
                    'SELECT DATE(date_upload) AS label, COUNT(*) AS value FROM cv GROUP BY DATE(date_upload) ORDER BY label DESC LIMIT 30'
                );
                const [enterprisesBySector] = await connection.execute('SELECT secteur AS label, COUNT(*) AS value FROM entreprise WHERE secteur IS NOT NULL GROUP BY secteur ORDER BY value DESC LIMIT 12');
                const topSkills = Array.from((await demandedSkills(connection)).values())
                    .sort((left, right) => right.demand_count - left.demand_count)
                    .slice(0, 12)
                    .map(skill => ({ label: skill.name, value: skill.demand_count }));

                return {
                    usersByRole: normalizeRows(usersByRole),
                    offersByLocation: normalizeRows(offersByLocation),
                    offersBySource: normalizeRows(offersBySource),
                    opportunitiesBySource: normalizeRows(opportunitiesBySource),
                    mostDemandedSkills: topSkills,
                    matchingScoreDistribution: normalizeRows(matchingDistribution),
                    cvUploadsOverTime: normalizeRows(cvUploads),
                    enterprisesBySector: normalizeRows(enterprisesBySector)
                };
            });
            res.json({ ok: true, data });
        } catch (error) {
            respondError(res, error, 'Erreur analyses');
        }
    });

    return router;
};

function normalizeRows(rows) {
    return rows.map(row => ({
        label: row.label || 'Non renseigné',
        value: Number(row.value) || 0
    }));
}
