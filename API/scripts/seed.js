#!/usr/bin/env node
const crypto = require('crypto');
const config = require('../lib/config');
const db = require('../lib/db');
const logger = require('../lib/logger');
const { hashPassword } = require('../lib/passwords');

const roles = [
    ['admin', 'Administrator', 'Full platform administration'],
    ['user', 'Candidate', 'Candidate account and personal records'],
    ['recruiter', 'Recruiter', 'Enterprise offer and application access']
];

const permissions = [
    ['admin.dashboard.read', 'Read admin dashboard'],
    ['admin.users.manage', 'Manage users'],
    ['admin.roles.manage', 'Manage roles and permissions'],
    ['admin.enterprises.manage', 'Manage enterprises'],
    ['admin.offers.manage', 'Manage offers'],
    ['admin.skills.manage', 'Manage skills'],
    ['admin.matching.read', 'Read matching analytics'],
    ['admin.billing.manage', 'Manage manual billing'],
    ['admin.support.manage', 'Manage support tickets'],
    ['admin.settings.manage', 'Manage application settings'],
    ['candidate.profile.manage', 'Manage own profile'],
    ['candidate.cv.manage', 'Manage own CV'],
    ['candidate.matching.run', 'Run own matching'],
    ['recruiter.offers.manage', 'Manage enterprise offers'],
    ['recruiter.applications.read', 'Read linked applications']
];

const plans = [
    ['free', 'Free', 'Candidate access with saved opportunities and applications', 0, ['Profile', 'Saved opportunities', 'Applications']],
    ['pro', 'Pro', 'Manual subscription for active recruiting teams', 499, ['Offer management', 'Candidate matching', 'Support']],
    ['enterprise', 'Enterprise', 'Manual enterprise subscription with admin-managed invoicing', 1499, ['Multiple recruiters', 'Advanced reporting', 'Priority support']]
];

async function main() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const roleIds = {};
        const permissionIds = {};

        for (const [code, label, description] of roles) {
            const id = crypto.randomUUID();
            await connection.execute(
                `INSERT INTO roles (id_role, code, label, description, is_system)
                 VALUES (?, ?, ?, ?, TRUE)
                 ON DUPLICATE KEY UPDATE label = VALUES(label), description = VALUES(description)`,
                [id, code, label, description]
            );
            const [rows] = await connection.execute('SELECT id_role FROM roles WHERE code = ?', [code]);
            roleIds[code] = rows[0].id_role;
        }

        for (const [code, label] of permissions) {
            const id = crypto.randomUUID();
            await connection.execute(
                `INSERT INTO permissions (id_permission, code, label)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE label = VALUES(label)`,
                [id, code, label]
            );
            const [rows] = await connection.execute('SELECT id_permission FROM permissions WHERE code = ?', [code]);
            permissionIds[code] = rows[0].id_permission;
        }

        await connection.execute('DELETE FROM role_permissions WHERE id_role IN (?, ?, ?)', [roleIds.admin, roleIds.user, roleIds.recruiter]);
        for (const code of Object.keys(permissionIds)) {
            await connection.execute('INSERT IGNORE INTO role_permissions (id_role, id_permission) VALUES (?, ?)', [roleIds.admin, permissionIds[code]]);
        }
        for (const code of ['candidate.profile.manage', 'candidate.cv.manage', 'candidate.matching.run']) {
            await connection.execute('INSERT IGNORE INTO role_permissions (id_role, id_permission) VALUES (?, ?)', [roleIds.user, permissionIds[code]]);
        }
        for (const code of ['recruiter.offers.manage', 'recruiter.applications.read']) {
            await connection.execute('INSERT IGNORE INTO role_permissions (id_role, id_permission) VALUES (?, ?)', [roleIds.recruiter, permissionIds[code]]);
        }

        for (const [code, name, description, price, features] of plans) {
            await connection.execute(
                `INSERT INTO plan_catalogue (id_plan, code, name, description, monthly_price, currency, features, active)
                 VALUES (?, ?, ?, ?, ?, 'MAD', ?, TRUE)
                 ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description),
                    monthly_price = VALUES(monthly_price), features = VALUES(features), active = TRUE`,
                [crypto.randomUUID(), code, name, description, price, JSON.stringify(features)]
            );
        }

        await connection.execute(
            `INSERT IGNORE INTO user_roles (id_user, id_role)
             SELECT u.id_user, r.id_role
             FROM utilisateur u
             JOIN roles r ON r.code = COALESCE(NULLIF(u.role, ''), 'user')`
        );

        await seedBootstrapAdmin(connection, roleIds.admin);
        await connection.commit();
        logger.info('Database seed complete');
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
        await db.close();
    }
}

async function seedBootstrapAdmin(connection, adminRoleId) {
    const localDefault = config.nodeEnv !== 'production' && !config.bootstrapAdmin.email && !config.bootstrapAdmin.password;
    const email = config.bootstrapAdmin.email || (localDefault ? 'admin@theway.local' : null);
    const password = config.bootstrapAdmin.password || (localDefault ? 'ChangeMe12345!' : null);
    if (!email || !password) return;

    const [existing] = await connection.execute('SELECT id_user FROM utilisateur WHERE email = ? LIMIT 1', [email]);
    const userId = existing.length ? existing[0].id_user : crypto.randomUUID();
    if (!existing.length) {
        const paramId = crypto.randomUUID();
        await connection.execute('INSERT INTO parametres (id_params, notification_email, notification_push) VALUES (?, ?, ?)', [paramId, 'enabled', 'enabled']);
        await connection.execute(
            `INSERT INTO utilisateur (id_user, id_params, nom, prenom, email, password, role)
             VALUES (?, ?, 'Admin', 'THEWAY', ?, ?, 'admin')`,
            [userId, paramId, email, await hashPassword(password)]
        );
    }
    await connection.execute('INSERT IGNORE INTO user_roles (id_user, id_role) VALUES (?, ?)', [userId, adminRoleId]);
}

main().catch(error => {
    logger.error({ err: error }, 'Database seed failed');
    process.exit(1);
});
