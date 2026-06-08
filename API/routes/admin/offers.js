const express = require('express');
const requireAdmin = require('../../middleware/requireAdmin');
const { id, pagination, normalizeLike, withConnection, httpError, respondError, parseSkills, skillString } = require('./helpers');

module.exports = function createAdminOffersRouter(deps) {
    const router = express.Router();
    const { getConnection, verifyToken } = deps;

    router.get('/api/admin/offers', verifyToken, requireAdmin, async (req, res) => {
        try {
            const data = await withConnection(getConnection, async connection => listOffers(connection, req.query));
            res.json({ ok: true, data });
        } catch (error) {
            respondError(res, error, 'Erreur offres');
        }
    });

    router.get('/api/admin/offers/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            const data = await withConnection(getConnection, async connection => getOffer(connection, req.params.id));
            res.json({ ok: true, data });
        } catch (error) {
            respondError(res, error, 'Erreur offre');
        }
    });

    router.post('/api/admin/offers', verifyToken, requireAdmin, async (req, res) => {
        try {
            const created = await withConnection(getConnection, async connection => {
                if (!req.body.titre && !req.body.title) throw httpError(400, 'Titre requis');
                if (!req.body.id_entreprise) {
                    const [result] = await connection.execute(
                        `INSERT INTO opportunities
                         (uid, source, title, company, location, source_url, description, skills)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            req.body.uid || id(),
                            req.body.source || 'admin',
                            req.body.titre || req.body.title,
                            req.body.company || req.body.entreprise || null,
                            req.body.localisation || req.body.location || null,
                            req.body.source_url || null,
                            req.body.description || null,
                            skillString(req.body.skills)
                        ]
                    );
                    return {
                        id: 'opportunity:' + result.insertId,
                        id_opportunity: result.insertId,
                        origin: 'opportunities'
                    };
                }
                const offerId = id();
                await connection.execute(
                    `INSERT INTO offre
                     (id_offre, id_entreprise, titre, description, localisation, type_contrat, source_url, source, skills, uid)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        offerId,
                        req.body.id_entreprise || null,
                        req.body.titre || req.body.title,
                        req.body.description || null,
                        req.body.localisation || req.body.location || null,
                        req.body.type_contrat || req.body.contract || null,
                        req.body.source_url || null,
                        req.body.source || 'admin',
                        skillString(req.body.skills),
                        req.body.uid || id()
                    ]
                );
                return {
                    id: offerId,
                    id_offre: offerId,
                    origin: 'offre'
                };
            });
            res.status(201).json({ ok: true, data: created });
        } catch (error) {
            respondError(res, error, 'Erreur création offre');
        }
    });

    router.put('/api/admin/offers/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            await withConnection(getConnection, async connection => updateOffer(connection, req.params.id, req.body));
            res.json({ ok: true });
        } catch (error) {
            respondError(res, error, 'Erreur modification offre');
        }
    });

    router.delete('/api/admin/offers/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            await withConnection(getConnection, async connection => {
                if (req.params.id.startsWith('opportunity:')) {
                    const [result] = await connection.execute('DELETE FROM opportunities WHERE id = ?', [req.params.id.replace('opportunity:', '')]);
                    if (!result.affectedRows) throw httpError(404, 'Offre introuvable');
                    return;
                }
                const [result] = await connection.execute('DELETE FROM offre WHERE id_offre = ?', [req.params.id]);
                if (!result.affectedRows) throw httpError(404, 'Offre introuvable');
            });
            res.json({ ok: true });
        } catch (error) {
            respondError(res, error, 'Erreur suppression offre');
        }
    });

    return router;
};

async function listOffers(connection, query) {
    const { page, limit, offset } = pagination(query);
    const filters = [];
    const params = [];
    if (query.search) {
        filters.push('(title LIKE ? OR company LIKE ? OR location LIKE ?)');
        const like = normalizeLike(query.search);
        params.push(like, like, like);
    }
    if (query.contract) {
        filters.push('contract = ?');
        params.push(query.contract);
    }
    if (query.source) {
        filters.push('source = ?');
        params.push(query.source);
    }
    const whereSQL = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
    const baseSQL = `
        SELECT id, origin, title, company, location, contract, source, source_url, description, skills, created_at
        FROM (
            SELECT o.id_offre AS id, 'offre' AS origin, o.titre AS title, COALESCE(e.nom, '') AS company,
                   o.localisation AS location, o.type_contrat AS contract, o.source AS source,
                   o.source_url, o.description, o.skills, o.date_publication AS created_at
            FROM offre o
            LEFT JOIN entreprise e ON e.id_entreprise = o.id_entreprise
            UNION ALL
            SELECT CONCAT('opportunity:', id) AS id, 'opportunities' AS origin, title, company,
                   location, NULL AS contract, source, source_url, description, skills, created_at
            FROM opportunities
        ) merged
        ${whereSQL}`;
    const [[count]] = await connection.execute(`SELECT COUNT(*) AS total FROM (${baseSQL}) counted`, params);
    const [rows] = await connection.execute(
        `${baseSQL} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        params.concat([limit, offset])
    );
    return {
        offers: rows.map(publicOffer),
        pagination: { page, limit, total: Number(count.total) || 0 }
    };
}

async function getOffer(connection, offerId) {
    if (offerId.startsWith('opportunity:')) {
        const [rows] = await connection.execute(
            'SELECT CONCAT("opportunity:", id) AS id, "opportunities" AS origin, title, company, location, NULL AS contract, source, source_url, description, skills, created_at FROM opportunities WHERE id = ?',
            [offerId.replace('opportunity:', '')]
        );
        if (!rows.length) throw httpError(404, 'Offre introuvable');
        return publicOffer(rows[0]);
    }
    const [rows] = await connection.execute(
        `SELECT o.id_offre AS id, 'offre' AS origin, o.titre AS title, COALESCE(e.nom, '') AS company,
                o.localisation AS location, o.type_contrat AS contract, o.source, o.source_url, o.description, o.skills, o.date_publication AS created_at
         FROM offre o
         LEFT JOIN entreprise e ON e.id_entreprise = o.id_entreprise
         WHERE o.id_offre = ?`,
        [offerId]
    );
    if (!rows.length) throw httpError(404, 'Offre introuvable');
    return publicOffer(rows[0]);
}

async function updateOffer(connection, offerId, body) {
    if (offerId.startsWith('opportunity:')) {
        const fields = [
            ['title', body.title || body.titre],
            ['company', body.company],
            ['location', body.location || body.localisation],
            ['source', body.source],
            ['source_url', body.source_url],
            ['description', body.description],
            ['skills', body.skills === undefined ? undefined : skillString(body.skills)]
        ].filter(item => item[1] !== undefined);
        if (!fields.length) throw httpError(400, 'Aucune donnée à mettre à jour');
        const [result] = await connection.execute(
            'UPDATE opportunities SET ' + fields.map(item => item[0] + ' = ?').join(', ') + ' WHERE id = ?',
            fields.map(item => item[1] || null).concat([offerId.replace('opportunity:', '')])
        );
        if (!result.affectedRows) throw httpError(404, 'Offre introuvable');
        return;
    }

    const fields = [
        ['id_entreprise', body.id_entreprise],
        ['titre', body.titre || body.title],
        ['description', body.description],
        ['localisation', body.localisation || body.location],
        ['type_contrat', body.type_contrat || body.contract],
        ['source_url', body.source_url],
        ['source', body.source],
        ['skills', body.skills === undefined ? undefined : skillString(body.skills)]
    ].filter(item => item[1] !== undefined);
    if (!fields.length) throw httpError(400, 'Aucune donnée à mettre à jour');
    const [result] = await connection.execute(
        'UPDATE offre SET ' + fields.map(item => item[0] + ' = ?').join(', ') + ' WHERE id_offre = ?',
        fields.map(item => item[1] || null).concat([offerId])
    );
    if (!result.affectedRows) throw httpError(404, 'Offre introuvable');
}

function publicOffer(row) {
    return {
        id: row.id,
        origin: row.origin,
        isOpportunity: row.origin === 'opportunities',
        title: row.title,
        titre: row.title,
        company: row.company,
        location: row.location,
        localisation: row.location,
        contract: row.contract,
        type_contrat: row.contract,
        source: row.source,
        source_url: row.source_url,
        description: row.description,
        skills: parseSkills(row.skills),
        created_at: row.created_at
    };
}
