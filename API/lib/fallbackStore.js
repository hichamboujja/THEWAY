const fs = require('fs');
const path = require('path');
const dataSecurity = require('./dataSecurity');
const encryptedEventLog = require('./encryptedEventLog');

const fsp = fs.promises;
const apiDataDir = path.join(__dirname, '..', 'data');
const stateLogPath = path.join(apiDataDir, 'fallback-state.log.enc');
const stateSnapshotPath = path.join(apiDataDir, 'fallback-state.snapshot.enc');
const actionLogPath = path.join(apiDataDir, 'fallback-actions.log.enc');
const legacySnapshotPath = path.join(apiDataDir, 'fallback-store.enc');
const legacyPlainStorePath = path.join(apiDataDir, 'fallback-store.json');
const MAX_ACTION_LOG_BYTES = 512 * 1024;
const MAX_ACTION_LOG_LINES = 1000;
const MAX_STATE_LOG_BYTES = 512 * 1024;
const MAX_LOCAL_USERS = 1000;
const MAX_LOCAL_SKILLS = 1000;
let cachedStore = null;
let userEmailIndex = null;
let userIdIndex = null;
const actionLogState = { count: 0 };
let mutationActive = false;
const mutationWaiters = [];
let readPromise = null;

function emptyStore() {
    return {
        users: [],
        skills: [],
        recoveryRequests: []
    };
}

function sanitizeStore(store) {
    return {
        users: Array.isArray(store && store.users) ? store.users : [],
        skills: Array.isArray(store && store.skills) ? store.skills : [],
        recoveryRequests: Array.isArray(store && store.recoveryRequests) ? store.recoveryRequests.slice(-50) : []
    };
}

function setCachedStore(store) {
    cachedStore = capStoreCollections(sanitizeStore(store));
    rebuildUserIndexes();
    return cachedStore;
}

function rebuildUserIndexes() {
    userEmailIndex = new Map();
    userIdIndex = new Map();
    cachedStore.users.forEach(indexUser);
}

function buildUserIndexes(store) {
    const indexes = {
        email: new Map(),
        id: new Map()
    };
    store.users.forEach(user => indexUserIn(indexes, user));
    return indexes;
}

function indexUser(user) {
    userEmailIndex.set(String(user.email || '').toLowerCase(), user);
    userIdIndex.set(String(user.id_user), user);
}

function indexUserIn(indexes, user) {
    indexes.email.set(String(user.email || '').toLowerCase(), user);
    indexes.id.set(String(user.id_user), user);
}

function unindexUser(user) {
    userEmailIndex.delete(String(user.email || '').toLowerCase());
    userIdIndex.delete(String(user.id_user));
}

function updateEmailIndex(user, oldEmail, newEmail) {
    userEmailIndex.delete(String(oldEmail || '').trim().toLowerCase());
    userEmailIndex.set(String(newEmail || '').trim().toLowerCase(), user);
}

function updateEmailIndexIn(indexes, user, oldEmail, newEmail) {
    indexes.email.delete(String(oldEmail || '').trim().toLowerCase());
    indexes.email.set(String(newEmail || '').trim().toLowerCase(), user);
}

function runMutation(work) {
    return acquireMutation().then(async release => {
        try {
            return await work();
        } finally {
            release();
        }
    });
}

function acquireMutation() {
    if (!mutationActive) {
        mutationActive = true;
        return Promise.resolve(releaseMutation);
    }
    return new Promise(resolve => {
        mutationWaiters.push(() => resolve(releaseMutation));
    });
}

function releaseMutation() {
    const next = mutationWaiters.shift();
    if (next) {
        next();
        return;
    }
    mutationActive = false;
}

function capStoreCollections(store) {
    store.users = store.users.slice(-MAX_LOCAL_USERS);
    store.skills = store.skills.slice(-MAX_LOCAL_SKILLS);
    return store;
}

async function read() {
    if (cachedStore) return cachedStore;
    if (readPromise) return await readPromise;
    readPromise = loadStore();
    try {
        return await readPromise;
    } finally {
        readPromise = null;
    }
}

async function loadStore() {
    const store = sanitizeStore(await encryptedEventLog.readSnapshot(stateSnapshotPath) || emptyStore());
    const replayIndexes = buildUserIndexes(store);
    const loaded = await encryptedEventLog.loadEvents(stateLogPath, event => applyEvent(store, event, replayIndexes));
    if (!loaded) {
        setCachedStore(await readLegacyStore() || store);
        return cachedStore;
    }
    await encryptedEventLog.compactLogWithSnapshot(stateLogPath, stateSnapshotPath, store, MAX_STATE_LOG_BYTES);
    setCachedStore(store);
    return cachedStore;
}

async function readLegacyStore() {
    const encrypted = await readLegacyEncryptedStore();
    if (encrypted) return encrypted;
    return await discardLegacyPlainStore();
}

async function readLegacyEncryptedStore() {
    try {
        const raw = await fsp.readFile(legacySnapshotPath, 'utf8');
        return sanitizeStore(JSON.parse(dataSecurity.decryptText(raw)));
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('Legacy encrypted fallback store read error:', error.message);
        return null;
    }
}

async function discardLegacyPlainStore() {
    try {
        await fsp.unlink(legacyPlainStorePath).catch(() => {});
        return null;
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('Legacy plaintext fallback store removed without import.');
        return null;
    }
}

function applyEvent(store, event, indexes) {
    if (!event || !event.type) return;
    if (event.type.startsWith('user.')) {
        applyUserEvent(store, event, indexes || currentIndexes());
        return;
    }
    if (event.type.startsWith('skill.')) {
        applySkillEvent(store, event);
        return;
    }
    if (event.type.startsWith('recovery.')) {
        applyRecoveryEvent(store, event);
    }
}

function currentIndexes() {
    return {
        email: userEmailIndex,
        id: userIdIndex
    };
}

function applyUserEvent(store, event, indexes) {
    if (event.type === 'user.created') {
        addLocalUser(store, event.user, indexes);
        return;
    }
    if (event.type === 'user.updated') {
        const user = indexes.id.get(String(event.id));
        if (!user) return;
        const oldEmailKey = String(user.email || '').trim().toLowerCase();
        Object.assign(user, event.updates);
        if (event.updates.email) updateEmailIndexIn(indexes, user, oldEmailKey, event.updates.email);
    }
}

function applySkillEvent(store, event) {
    if (event.type === 'skill.created') {
        store.skills.push(event.skill);
        capStoreCollections(store);
        return;
    }
    if (event.type === 'skill.updated') {
        const skill = store.skills.find(item => String(item.id_skill || item.id) === String(event.id));
        if (!skill) return;
        Object.assign(skill, event.updates);
        return;
    }
    if (event.type === 'skill.deleted') {
        store.skills = store.skills.filter(item => String(item.id_skill || item.id) !== String(event.id));
    }
}

function applyRecoveryEvent(store, event) {
    if (event.type === 'recovery.created') {
        store.recoveryRequests.push(event.request);
        store.recoveryRequests = store.recoveryRequests.slice(-50);
    }
}

async function appendStateEvent(event) {
    await encryptedEventLog.appendEvent(stateLogPath, event);
}

function isDatabaseUnavailable(error) {
    return [
        'ECONNREFUSED',
        'ENOTFOUND',
        'ETIMEDOUT',
        'ER_ACCESS_DENIED_ERROR',
        'ER_BAD_DB_ERROR',
        'ER_NO_SUCH_TABLE',
        'PROTOCOL_CONNECTION_LOST'
    ].includes(error && error.code);
}

function publicUser(user) {
    return {
        id: user.id_user || user.id,
        id_params: user.id_params || null,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone || null,
        localisation: user.localisation || null,
        photo: user.photo || null,
        role: user.role || 'user'
    };
}

function exportUser(user) {
    return {
        id: user.id_user || user.id,
        email: user.email,
        role: user.role || 'user'
    };
}

async function recordAction(type, userId, payload) {
    const entry = {
        id: dataSecurity.randomId(),
        type: type,
        userId: userId || null,
        payload: redactPayload(payload || {}),
        createdAt: new Date().toISOString()
    };
    await encryptedEventLog.appendBoundedEvent(actionLogPath, entry, {
        state: actionLogState,
        trimEvery: 25,
        maxBytes: MAX_ACTION_LOG_BYTES,
        maxLines: MAX_ACTION_LOG_LINES
    });
}

function redactPayload(value) {
    if (Array.isArray(value)) return value.map(redactPayload);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((clean, key) => {
        if (/password|token|secret|authorization/i.test(key)) {
            clean[key] = '[redacted]';
            return clean;
        }
        clean[key] = redactPayload(value[key]);
        return clean;
    }, {});
}

async function createUser(data) {
    return await runMutation(async () => {
        if (!data.password && !data.passwordHash) throw new Error('Mot de passe requis pour creer un utilisateur local.');
        const store = await read();
        const email = String(data.email || '').trim().toLowerCase();
        if (userEmailIndex && userEmailIndex.has(email)) {
            const error = new Error('Utilisateur deja existant');
            error.status = 400;
            throw error;
        }

        const user = await buildLocalUser(data, email);
        await appendStateEvent({ type: 'user.created', user: user });
        addLocalUser(store, user);
        return user;
    });
}

async function buildLocalUser(data, email) {
    return {
        id_user: dataSecurity.randomId(),
        id_params: dataSecurity.randomId(),
        parametres: {
            notification_email: 'enabled',
            notification_push: 'enabled'
        },
        nom: data.nom,
        prenom: data.prenom,
        email: email,
        password: data.passwordHash || await dataSecurity.hashPassword(data.password),
        telephone: data.telephone || null,
        localisation: data.localisation || null,
        photo: data.photo || null,
        role: data.role || 'user'
    };
}

function addLocalUser(store, user, indexes) {
    indexes = indexes || currentIndexes();
    store.users.push(user);
    while (store.users.length > MAX_LOCAL_USERS) {
        const removed = store.users.shift();
        if (removed) {
            indexes.email.delete(String(removed.email || '').toLowerCase());
            indexes.id.delete(String(removed.id_user));
        }
    }
    indexUserIn(indexes, user);
}

async function findUserByEmail(email) {
    await read();
    return userEmailIndex.get(String(email || '').trim().toLowerCase()) || null;
}

async function findUserById(id) {
    await read();
    return userIdIndex.get(String(id)) || null;
}

async function updateUser(id, updates) {
    return await runMutation(async () => {
        await read();
        const user = userIdIndex.get(String(id));
        if (!user) return null;
        const event = { type: 'user.updated', id: id, updates: updates };
        await appendStateEvent(event);
        applyUserEvent(cachedStore, event);
        return user;
    });
}

async function addSkill(data) {
    return await runMutation(async () => {
        const store = await read();
        const id = dataSecurity.randomId();
        const skill = {
            id,
            id_skill: id,
            nom: data.nom,
            categorie: data.categorie || 'general',
            niveau: data.niveau || null,
            score: clampScore(data.score)
        };
        await appendStateEvent({ type: 'skill.created', skill: skill });
        store.skills.push(skill);
        capStoreCollections(store);
        return skill;
    });
}

async function listSkills() {
    return (await read()).skills;
}

async function updateSkill(id, updates) {
    return await runMutation(async () => {
        const store = await read();
        const skill = store.skills.find(item => String(item.id_skill || item.id) === String(id));
        if (!skill) return null;
        const cleanUpdates = {
            niveau: updates.niveau || null,
            score: clampScore(updates.score)
        };
        await appendStateEvent({ type: 'skill.updated', id, updates: cleanUpdates });
        Object.assign(skill, cleanUpdates);
        return skill;
    });
}

async function deleteSkill(id) {
    return await runMutation(async () => {
        const store = await read();
        const index = store.skills.findIndex(item => String(item.id_skill || item.id) === String(id));
        if (index === -1) return false;
        await appendStateEvent({ type: 'skill.deleted', id });
        store.skills.splice(index, 1);
        return true;
    });
}

function clampScore(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(Math.max(parsed, 0), 100);
}

async function storeRecoveryRequest(request) {
    return await runMutation(async () => {
        const store = await read();
        const entry = {
            id: dataSecurity.randomId(),
            email: request.email,
            tokenHash: request.tokenHash,
            expiresAt: request.expiresAt,
            requestedAt: request.requestedAt
        };
        await appendStateEvent({ type: 'recovery.created', request: entry });
        store.recoveryRequests.push(entry);
        store.recoveryRequests = store.recoveryRequests.slice(-50);
    });
}

async function exportRows(kind) {
    const store = await read();
    const exportKind = String(kind || 'summary').toLowerCase();
    if (exportKind.includes('user')) return store.users.map(user => exportUser(user));
    if (exportKind.includes('skill') || exportKind.includes('competence')) return store.skills;
    return [
        { resource: 'users', count: store.users.length },
        { resource: 'skills', count: store.skills.length }
    ];
}

async function forEachExportRow(kind, callback) {
    const rows = await exportRows(kind);
    for (const row of rows) await callback(row);
}

module.exports = {
    isDatabaseUnavailable,
    publicUser,
    recordAction,
    createUser,
    findUserByEmail,
    findUserById,
    updateUser,
    addSkill,
    listSkills,
    updateSkill,
    deleteSkill,
    storeRecoveryRequest,
    exportRows,
    forEachExportRow
};
