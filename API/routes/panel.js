const express = require('express');

module.exports = function createPanelRouter(deps) {
    const router = express.Router();
    const { getConnection, verifyToken } = deps;

    router.get('/api/panel/summary', async (req, res) => {
        try {
            const connection = await getConnection();
            try {
                const [[opportunities]] = await connection.execute(
                    'SELECT COUNT(*) AS total, COUNT(DISTINCT NULLIF(company, "")) AS companies FROM opportunities'
                );
                const [[users]] = await connection.execute('SELECT COUNT(*) AS total FROM utilisateur');
                const [[skills]] = await connection.execute('SELECT COUNT(*) AS total FROM competence');
                const [sources] = await connection.execute(
                    'SELECT source, COUNT(*) AS total FROM opportunities WHERE source IS NOT NULL AND source <> "" GROUP BY source ORDER BY total DESC LIMIT 8'
                );
                const [recentOpportunities] = await connection.execute(
                    'SELECT id, uid, source, title, company, location, source_url, description, skills FROM opportunities ORDER BY created_at DESC, id DESC LIMIT 8'
                );

                res.json({
                    ok: true,
                    mode: 'database',
                    summary: {
                        opportunities: Number(opportunities.total) || 0,
                        companies: Number(opportunities.companies) || 0,
                        users: Number(users.total) || 0,
                        skills: Number(skills.total) || 0,
                        sources: sources.map(row => ({
                            source: row.source,
                            total: Number(row.total) || 0
                        }))
                    },
                    recentOpportunities: recentOpportunities.map(publicOpportunity)
                });
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Panel summary error:', error);
            res.status(500).json({ ok: false, error: 'Erreur statistiques' });
        }
    });

    router.get('/api/panel/skills', async (req, res) => {
        try {
            const connection = await getConnection();
            try {
                const skills = await listPanelSkills(connection);
                res.json({
                    ok: true,
                    mode: 'database',
                    skills: skills
                });
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Panel skills error:', error);
            res.status(500).json({ ok: false, error: 'Erreur compétences' });
        }
    });

    router.get('/api/panel/users', verifyToken, async (req, res) => {
        try {
            const connection = await getConnection();
            try {
                const [users] = await connection.execute(
                    'SELECT id_user, nom, prenom, email, telephone, localisation, role, date_inscription FROM utilisateur ORDER BY date_inscription DESC LIMIT 200'
                );
                res.json({
                    ok: true,
                    mode: 'database',
                    users: users.map(publicUser)
                });
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Panel users error:', error);
            res.status(500).json({ ok: false, error: 'Erreur utilisateurs' });
        }
    });

    return router;
};

async function listPanelSkills(connection) {
    const [dbSkills] = await connection.execute(
        'SELECT id_skill, nom, categorie, created_at FROM competence ORDER BY created_at DESC LIMIT 200'
    );
    const demandBySkill = await countOpportunitySkills(connection);
    const byName = new Map();

    dbSkills.forEach(row => {
        const name = String(row.nom || '').trim();
        if (!name) return;
        byName.set(normalizeKey(name), {
            id: row.id_skill,
            id_skill: row.id_skill,
            nom: name,
            name: name,
            categorie: row.categorie || categoryForSkill(name),
            category: row.categorie || categoryForSkill(name),
            demand: demandBySkill.get(normalizeKey(name)) || 0,
            created_at: row.created_at
        });
    });

    demandBySkill.forEach((demand, key) => {
        if (byName.has(key)) return;
        const name = restoreSkillName(key);
        byName.set(key, {
            id: key,
            id_skill: key,
            nom: name,
            name: name,
            categorie: categoryForSkill(name),
            category: categoryForSkill(name),
            demand: demand,
            created_at: null
        });
    });

    return Array.from(byName.values())
        .sort((left, right) => (right.demand || 0) - (left.demand || 0) || left.name.localeCompare(right.name, 'fr'))
        .slice(0, 120)
        .map((skill, index) => {
            const demand = Number(skill.demand) || 0;
            return Object.assign(skill, {
                users: Math.max(1, Math.round(demand * 1.6)),
                trend: Math.min(38, Math.max(6, 8 + (index % 8) * 3)),
                priority: demand >= 80 ? 'Élevée' : demand >= 25 ? 'Moyenne' : 'Faible',
                status: demand >= 25 ? 'Active' : 'En hausse'
            });
        });
}

async function countOpportunitySkills(connection) {
    const [rows] = await connection.execute(
        'SELECT skills FROM opportunities WHERE skills IS NOT NULL AND skills <> "" LIMIT 2500'
    );
    const counts = new Map();

    rows.forEach(row => {
        parseSkills(row.skills).forEach(skill => {
            const key = normalizeKey(skill);
            if (!key) return;
            counts.set(key, (counts.get(key) || 0) + 1);
        });
    });

    return counts;
}

function parseSkills(value) {
    if (Array.isArray(value)) return value;
    const raw = String(value || '').trim();
    if (!raw) return [];

    if (raw.startsWith('[')) {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    return raw.split(',').map(skill => skill.trim()).filter(Boolean);
}

function publicOpportunity(row) {
    return {
        id: row.id,
        uid: row.uid,
        source: row.source,
        title: row.title,
        company: row.company,
        location: row.location,
        source_url: row.source_url,
        description: row.description,
        skills: parseSkills(row.skills)
    };
}

function publicUser(user) {
    const fullName = [user.prenom, user.nom].filter(Boolean).join(' ').trim() || user.email;
    return {
        id: user.id_user,
        id_user: user.id_user,
        name: fullName,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        localisation: user.localisation,
        role: user.role || 'user',
        date_inscription: user.date_inscription
    };
}

function normalizeKey(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function restoreSkillName(key) {
    return String(key || '')
        .split(/\s+/)
        .map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '')
        .join(' ');
}

function categoryForSkill(name) {
    const key = normalizeKey(name);
    if (/(react|vue|angular|html|css|figma|ui|ux)/.test(key)) return 'Frontend';
    if (/(node|express|php|laravel|django|flask|spring|api|sql|mysql|postgres)/.test(key)) return 'Backend';
    if (/(docker|kubernetes|aws|azure|cloud|devops|linux|ci\/cd)/.test(key)) return 'DevOps';
    if (/(data|ia|ai|machine learning|power bi|excel)/.test(key)) return 'Data';
    if (/(rh|recrutement|formation|paie)/.test(key)) return 'RH';
    if (/(vente|commercial|marketing|seo|crm)/.test(key)) return 'Business';
    return 'Général';
}
