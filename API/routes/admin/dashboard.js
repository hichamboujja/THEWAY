const express = require('express');
const requireAdmin = require('../../middleware/requireAdmin');
const { withConnection, parseSkills } = require('./helpers');

module.exports = function createAdminDashboardRouter(deps) {
    const router = express.Router();
    const { getConnection, verifyToken } = deps;

    router.get('/api/admin/dashboard', verifyToken, requireAdmin, async (req, res) => {
        try {
            const data = await withConnection(getConnection, async connection => {
                const [[users]] = await connection.execute('SELECT COUNT(*) AS total FROM utilisateur');
                const [[enterprises]] = await connection.execute('SELECT COUNT(*) AS total FROM entreprise');
                const [[offers]] = await connection.execute('SELECT COUNT(*) AS total FROM offre');
                const [[opportunities]] = await connection.execute('SELECT COUNT(*) AS total FROM opportunities');
                const [[skills]] = await connection.execute('SELECT COUNT(*) AS total FROM competence');
                const [[cvs]] = await connection.execute('SELECT COUNT(*) AS total FROM cv');
                const [[matching]] = await connection.execute('SELECT AVG(score) AS average_score, COUNT(*) AS total FROM matching');

                const [recentUsers] = await connection.execute(
                    'SELECT id_user, nom, prenom, email, role, photo, date_inscription FROM utilisateur ORDER BY date_inscription DESC LIMIT 8'
                );
                const [recentOffers] = await connection.execute(
                    `SELECT id, origin, title, company, location, contract, source, created_at
                     FROM (
                        SELECT o.id_offre AS id, 'offre' AS origin, o.titre AS title, COALESCE(e.nom, '') AS company,
                               o.localisation AS location, o.type_contrat AS contract, o.source, o.date_publication AS created_at
                        FROM offre o
                        LEFT JOIN entreprise e ON e.id_entreprise = o.id_entreprise
                        UNION ALL
                        SELECT CONCAT('opportunity:', id) AS id, 'opportunities' AS origin, title, company,
                               location, NULL AS contract, source, created_at
                        FROM opportunities
                     ) merged
                     ORDER BY created_at DESC
                     LIMIT 8`
                );
                const [recentOpportunities] = await connection.execute(
                    'SELECT id, uid, title, company, location, source, skills, created_at FROM opportunities ORDER BY created_at DESC, id DESC LIMIT 8'
                );
                const [latestNotifications] = await connection.execute(
                    'SELECT id_notification, type, message, date_notification, lu FROM notification ORDER BY date_notification DESC LIMIT 8'
                );
                const [progressionStats] = await connection.execute(
                    'SELECT COUNT(*) AS total, AVG(score_globale) AS average_score, MAX(date_progression) AS last_progression FROM progression'
                );

                return {
                    totals: {
                        users: Number(users.total) || 0,
                        enterprises: Number(enterprises.total) || 0,
                        offers: (Number(offers.total) || 0) + (Number(opportunities.total) || 0),
                        databaseOffers: Number(offers.total) || 0,
                        opportunities: Number(opportunities.total) || 0,
                        skills: Number(skills.total) || 0,
                        cvs: Number(cvs.total) || 0,
                        matching: Number(matching.total) || 0,
                        averageMatchingScore: Math.round(Number(matching.average_score) || 0)
                    },
                    recentUsers: recentUsers.map(publicUser),
                    recentOffers: recentOffers.map(publicOffer),
                    recentOpportunities: recentOpportunities.map(publicOpportunity),
                    latestNotifications: latestNotifications,
                    progression: {
                        total: Number(progressionStats[0] && progressionStats[0].total) || 0,
                        averageScore: Math.round(Number(progressionStats[0] && progressionStats[0].average_score) || 0),
                        lastProgression: progressionStats[0] && progressionStats[0].last_progression
                    }
                };
            });

            res.json({ ok: true, data });
        } catch (error) {
            console.error('Admin dashboard error:', error);
            res.status(500).json({ ok: false, error: 'Impossible de charger les données.' });
        }
    });

    return router;
};

function publicUser(row) {
    return {
        id: row.id_user,
        id_user: row.id_user,
        name: [row.prenom, row.nom].filter(Boolean).join(' ').trim() || row.email,
        nom: row.nom,
        prenom: row.prenom,
        email: row.email,
        role: row.role,
        photo: row.photo,
        date_inscription: row.date_inscription
    };
}

function publicOffer(row) {
    return {
        id: row.id,
        id_offre: row.origin === 'offre' ? row.id : null,
        origin: row.origin,
        isOpportunity: row.origin === 'opportunities',
        title: row.title,
        company: row.company,
        location: row.location,
        contract: row.contract,
        source: row.source,
        date_publication: row.created_at,
        created_at: row.created_at
    };
}

function publicOpportunity(row) {
    return {
        id: row.id,
        uid: row.uid,
        title: row.title,
        company: row.company,
        location: row.location,
        source: row.source,
        skills: parseSkills(row.skills),
        created_at: row.created_at
    };
}
