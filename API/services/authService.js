const crypto = require('crypto');
const { deliverRecoveryToken } = require('../lib/recoveryDelivery');
const { hashPassword, verifyPassword } = require('../lib/passwords');

async function registerUser(deps, data) {
    const { nom, prenom, email, password, telephone, localisation } = data;
    if (!email || !password || !nom || !prenom) {
        throw httpError(400, 'Données manquantes');
    }
    try {
        await assertEmailAvailable(deps.getConnection, email);
        const hashedPassword = await hashPassword(password);
        return await createDatabaseUser(deps, {
            nom,
            prenom,
            email,
            hashedPassword,
            telephone,
            localisation
        });
    } catch (error) {
        if (deps.fallbackStore.isDatabaseUnavailable(error)) {
            const passwordHash = await hashPassword(password);
            const fallbackUser = await deps.fallbackStore.createUser({ nom, prenom, email, passwordHash, telephone, localisation });
            return {
                ok: true,
                mode: 'file',
                message: 'Utilisateur créé avec succès',
                token: deps.signUserToken(tokenUser(fallbackUser)),
                user: deps.fallbackStore.publicUser(fallbackUser)
            };
        }
        throw error;
    }
}

async function loginUser(deps, data) {
    const { email, password } = data;
    if (!email || !password) {
        throw httpError(400, 'Email et mot de passe requis');
    }

    try {
        return await withConnection(deps.getConnection, async connection => {
            const [users] = await connection.execute(
                'SELECT id_user, nom, prenom, email, password, role FROM utilisateur WHERE email = ?',
                [email]
            );
            if (users.length === 0) throw httpError(401, 'Identifiants invalides');

            const user = users[0];
            const validPassword = await verifyPassword(user.password, password);
            if (!validPassword) throw httpError(401, 'Identifiants invalides');

            return {
                ok: true,
                message: 'Connexion réussie',
                token: deps.signUserToken(tokenUser(user)),
                user: {
                    id: user.id_user,
                    nom: user.nom,
                    prenom: user.prenom,
                    email: user.email,
                    role: user.role
                }
            };
        });
    } catch (error) {
        if (deps.fallbackStore.isDatabaseUnavailable(error)) {
            const fallbackUser = await deps.fallbackStore.findUserByEmail(email);
            if (!fallbackUser) throw httpError(401, 'Identifiants invalides');

            const validPassword = await verifyPassword(fallbackUser.password, password);
            if (!validPassword) throw httpError(401, 'Identifiants invalides');

            return {
                ok: true,
                mode: 'file',
                message: 'Connexion réussie',
                token: deps.signUserToken(tokenUser(fallbackUser)),
                user: deps.fallbackStore.publicUser(fallbackUser)
            };
        }
        throw error;
    }
}

async function requestPasswordRecovery(deps, data) {
    const { email } = data;
    if (!email) throw httpError(400, 'Email requis');

    const resetToken = crypto.randomBytes(32).toString('hex');
    const requestedAt = new Date();
    await deliverRecoveryToken(email, resetToken);
    await deps.fallbackStore.storeRecoveryRequest({
        email: email,
        tokenHash: crypto.createHash('sha256').update(resetToken).digest('hex'),
        requestedAt: requestedAt.toISOString(),
        expiresAt: new Date(requestedAt.getTime() + 60 * 60 * 1000).toISOString()
    });

    return {
        ok: true,
        message: 'Demande de récupération enregistrée.'
    };
}

async function assertEmailAvailable(getConnection, email) {
    await withConnection(getConnection, async connection => {
        const [existing] = await connection.execute(
            'SELECT id_user FROM utilisateur WHERE email = ?',
            [email]
        );
        if (existing.length > 0) {
            throw httpError(400, 'Utilisateur déjà existant');
        }
    });
}

async function createDatabaseUser(deps, data) {
    return await withConnection(deps.getConnection, async connection => {
        await connection.beginTransaction();
        try {
            const paramId = crypto.randomUUID();
            const userId = crypto.randomUUID();
            await connection.execute(
                'INSERT INTO parametres (id_params, notification_email, notification_push) VALUES (?, ?, ?)',
                [paramId, 'enabled', 'enabled']
            );
            await connection.execute(
                'INSERT INTO utilisateur (id_user, id_params, nom, prenom, email, password, telephone, localisation, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [userId, paramId, data.nom, data.prenom, data.email, data.hashedPassword, data.telephone || null, data.localisation || null, 'user']
            );
            await connection.commit();

            const user = {
                id: userId,
                id_user: userId,
                nom: data.nom,
                prenom: data.prenom,
                email: data.email,
                role: 'user'
            };
            return {
                ok: true,
                message: 'Utilisateur créé avec succès',
                token: deps.signUserToken(tokenUser(user)),
                user: {
                    id: user.id_user,
                    nom: user.nom,
                    prenom: user.prenom,
                    email: user.email,
                    role: user.role
                }
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        }
    });
}

async function withConnection(getConnection, work) {
    let connection = null;
    try {
        connection = await getConnection();
        return await work(connection);
    } finally {
        if (connection) connection.release();
    }
}

function httpError(status, message) {
    const error = new Error(message);
    error.status = status;
    error.publicMessage = message;
    return error;
}

function tokenUser(user) {
    return {
        id_user: user.id_user || user.id,
        email: user.email,
        role: user.role || 'user'
    };
}

module.exports = {
    registerUser,
    loginUser,
    requestPasswordRecovery
};
