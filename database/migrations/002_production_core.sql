-- THEWAY production core schema.
-- This migration preserves the original MySQL tables and adds production-only
-- data needed for sessions, roles, files, AI jobs, billing, audit, and ops.

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(191) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
    id_role CHAR(36) PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    label VARCHAR(120) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
    id_permission CHAR(36) PRIMARY KEY,
    code VARCHAR(120) NOT NULL UNIQUE,
    label VARCHAR(160) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
    id_role CHAR(36) NOT NULL,
    id_permission CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_role, id_permission),
    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (id_role) REFERENCES roles(id_role)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (id_permission) REFERENCES permissions(id_permission)
        ON DELETE CASCADE ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
    id_user CHAR(36) NOT NULL,
    id_role CHAR(36) NOT NULL,
    granted_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_user, id_role),
    INDEX idx_user_roles_role (id_role),
    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (id_role) REFERENCES roles(id_role)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_user_roles_granted_by
        FOREIGN KEY (granted_by) REFERENCES utilisateur(id_user)
        ON DELETE SET NULL ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_sessions (
    sid VARCHAR(128) PRIMARY KEY,
    sess LONGTEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    id_user CHAR(36),
    ip_address VARCHAR(64),
    user_agent VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_auth_sessions_expires (expires_at),
    INDEX idx_auth_sessions_user (id_user),
    CONSTRAINT fk_auth_sessions_user
        FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
        ON DELETE SET NULL ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_accounts (
    id_auth_account CHAR(36) PRIMARY KEY,
    id_user CHAR(36) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    provider_subject VARCHAR(191) NOT NULL,
    email VARCHAR(255),
    display_name VARCHAR(255),
    access_token_enc TEXT,
    refresh_token_enc TEXT,
    expires_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_auth_accounts_provider_subject (provider, provider_subject),
    INDEX idx_auth_accounts_user (id_user),
    CONSTRAINT fk_auth_accounts_user
        FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id_reset_token CHAR(36) PRIMARY KEY,
    id_user CHAR(36) NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    requested_ip VARCHAR(64),
    requested_user_agent VARCHAR(512),
    expires_at DATETIME NOT NULL,
    consumed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_password_reset_user (id_user),
    INDEX idx_password_reset_expiry (expires_at),
    CONSTRAINT fk_password_reset_user
        FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id_email_token CHAR(36) PRIMARY KEY,
    id_user CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    consumed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_verification_user (id_user),
    CONSTRAINT fk_email_verification_user
        FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS file_asset (
    id_file CHAR(36) PRIMARY KEY,
    id_user CHAR(36) NOT NULL,
    owner_type VARCHAR(64) NOT NULL DEFAULT 'user',
    owner_id CHAR(36),
    storage_driver VARCHAR(32) NOT NULL,
    bucket VARCHAR(191),
    object_key VARCHAR(512) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(191) NOT NULL,
    extension VARCHAR(32) NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    checksum_sha256 CHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    visibility VARCHAR(32) NOT NULL DEFAULT 'private',
    malware_scan_status VARCHAR(32) NOT NULL DEFAULT 'not_required',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_at DATETIME,
    deleted_at DATETIME,
    UNIQUE KEY uq_file_asset_object_key (object_key),
    INDEX idx_file_asset_user (id_user, status),
    INDEX idx_file_asset_owner (owner_type, owner_id),
    CONSTRAINT fk_file_asset_user
        FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saved_opportunity (
    id_saved CHAR(36) PRIMARY KEY,
    id_user CHAR(36) NOT NULL,
    opportunity_id INT,
    opportunity_uid VARCHAR(64),
    id_offre CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_saved_user_opportunity (id_user, opportunity_id),
    UNIQUE KEY uq_saved_user_offer (id_user, id_offre),
    INDEX idx_saved_user (id_user),
    CONSTRAINT fk_saved_user
        FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_saved_offer
        FOREIGN KEY (id_offre) REFERENCES offre(id_offre)
        ON DELETE CASCADE ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS application (
    id_application CHAR(36) PRIMARY KEY,
    id_user CHAR(36) NOT NULL,
    opportunity_id INT,
    id_offre CHAR(36),
    cv_file_id CHAR(36),
    status VARCHAR(32) NOT NULL DEFAULT 'submitted',
    cover_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_application_user_opportunity (id_user, opportunity_id),
    UNIQUE KEY uq_application_user_offer (id_user, id_offre),
    INDEX idx_application_user (id_user, status),
    INDEX idx_application_opportunity (opportunity_id),
    CONSTRAINT fk_application_user
        FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_application_offer
        FOREIGN KEY (id_offre) REFERENCES offre(id_offre)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_application_cv_file
        FOREIGN KEY (cv_file_id) REFERENCES file_asset(id_file)
        ON DELETE SET NULL ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cv_analysis (
    id_analysis CHAR(36) PRIMARY KEY,
    id_cv CHAR(36) NOT NULL,
    id_user CHAR(36) NOT NULL,
    id_file CHAR(36),
    provider VARCHAR(64) NOT NULL,
    model VARCHAR(120),
    prompt_version VARCHAR(64) NOT NULL,
    provider_response_id VARCHAR(191),
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    extracted_skills JSON,
    summary TEXT,
    raw_response JSON,
    error_message TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cv_analysis_user (id_user, created_at),
    INDEX idx_cv_analysis_cv (id_cv),
    CONSTRAINT fk_cv_analysis_cv
        FOREIGN KEY (id_cv) REFERENCES cv(id_cv)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cv_analysis_user
        FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cv_analysis_file
        FOREIGN KEY (id_file) REFERENCES file_asset(id_file)
        ON DELETE SET NULL ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS matching_run (
    id_matching_run CHAR(36) PRIMARY KEY,
    id_user CHAR(36) NOT NULL,
    id_cv CHAR(36),
    provider VARCHAR(64) NOT NULL,
    model VARCHAR(120),
    prompt_version VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(191),
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    UNIQUE KEY uq_matching_run_idempotency (id_user, idempotency_key),
    INDEX idx_matching_run_user (id_user, created_at),
    CONSTRAINT fk_matching_run_user
        FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_matching_run_cv
        FOREIGN KEY (id_cv) REFERENCES cv(id_cv)
        ON DELETE SET NULL ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS matching_result (
    id_matching_result CHAR(36) PRIMARY KEY,
    id_matching_run CHAR(36) NOT NULL,
    id_user CHAR(36) NOT NULL,
    opportunity_id INT,
    id_offre CHAR(36),
    score INT NOT NULL DEFAULT 0,
    matched_skills JSON,
    missing_skills JSON,
    explanation TEXT,
    provider_response_id VARCHAR(191),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_matching_result_run_opportunity (id_matching_run, opportunity_id),
    UNIQUE KEY uq_matching_result_run_offer (id_matching_run, id_offre),
    INDEX idx_matching_result_user_score (id_user, score),
    CONSTRAINT fk_matching_result_run
        FOREIGN KEY (id_matching_run) REFERENCES matching_run(id_matching_run)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_matching_result_user
        FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_matching_result_offer
        FOREIGN KEY (id_offre) REFERENCES offre(id_offre)
        ON DELETE CASCADE ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plan_catalogue (
    id_plan CHAR(36) PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'MAD',
    features JSON,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS billing_subscription (
    id_subscription CHAR(36) PRIMARY KEY,
    id_user CHAR(36),
    id_entreprise CHAR(36),
    id_plan CHAR(36) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    starts_at DATE,
    ends_at DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_billing_subscription_user (id_user, status),
    INDEX idx_billing_subscription_enterprise (id_entreprise, status),
    CONSTRAINT fk_billing_subscription_user
        FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_billing_subscription_enterprise
        FOREIGN KEY (id_entreprise) REFERENCES entreprise(id_entreprise)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_billing_subscription_plan
        FOREIGN KEY (id_plan) REFERENCES plan_catalogue(id_plan)
        ON DELETE RESTRICT ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS billing_invoice (
    id_invoice CHAR(36) PRIMARY KEY,
    id_subscription CHAR(36),
    invoice_number VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'MAD',
    issued_at DATE,
    due_at DATE,
    paid_at DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_billing_invoice_subscription (id_subscription, status),
    CONSTRAINT fk_billing_invoice_subscription
        FOREIGN KEY (id_subscription) REFERENCES billing_subscription(id_subscription)
        ON DELETE SET NULL ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS billing_payment (
    id_payment CHAR(36) PRIMARY KEY,
    id_invoice CHAR(36) NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'MAD',
    method VARCHAR(64) NOT NULL DEFAULT 'manual',
    reference VARCHAR(191),
    received_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_billing_payment_invoice (id_invoice),
    CONSTRAINT fk_billing_payment_invoice
        FOREIGN KEY (id_invoice) REFERENCES billing_invoice(id_invoice)
        ON DELETE CASCADE ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS upgrade_request (
    id_upgrade_request CHAR(36) PRIMARY KEY,
    id_user CHAR(36) NOT NULL,
    requested_plan_code VARCHAR(64),
    message TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_upgrade_request_user (id_user, status),
    CONSTRAINT fk_upgrade_request_user
        FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_setting (
    setting_key VARCHAR(120) PRIMARY KEY,
    value_json JSON NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by CHAR(36),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_app_setting_updated_by
        FOREIGN KEY (updated_by) REFERENCES utilisateur(id_user)
        ON DELETE SET NULL ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_setting (
    id_user CHAR(36) NOT NULL,
    setting_key VARCHAR(120) NOT NULL,
    value_json JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_user, setting_key),
    CONSTRAINT fk_user_setting_user
        FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS outbound_email (
    id_email CHAR(36) PRIMARY KEY,
    id_user CHAR(36),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    template VARCHAR(120),
    provider VARCHAR(64),
    provider_message_id VARCHAR(191),
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    INDEX idx_outbound_email_user (id_user, created_at),
    INDEX idx_outbound_email_status (status, created_at),
    CONSTRAINT fk_outbound_email_user
        FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
        ON DELETE SET NULL ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS webhook_event (
    id_webhook_event CHAR(36) PRIMARY KEY,
    provider VARCHAR(64) NOT NULL,
    event_id VARCHAR(191) NOT NULL,
    event_type VARCHAR(120) NOT NULL,
    payload JSON,
    processed_at DATETIME,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_webhook_provider_event (provider, event_id),
    INDEX idx_webhook_provider_type (provider, event_type)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limit_bucket (
    bucket_key VARCHAR(191) NOT NULL,
    window_start DATETIME NOT NULL,
    request_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (bucket_key, window_start)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_log (
    id_audit CHAR(36) PRIMARY KEY,
    actor_user_id CHAR(36),
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(120),
    entity_id VARCHAR(191),
    metadata JSON,
    ip_address VARCHAR(64),
    user_agent VARCHAR(512),
    request_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_actor (actor_user_id, created_at),
    INDEX idx_audit_entity (entity_type, entity_id),
    CONSTRAINT fk_audit_actor
        FOREIGN KEY (actor_user_id) REFERENCES utilisateur(id_user)
        ON DELETE SET NULL ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS import_job (
    id_import_job CHAR(36) PRIMARY KEY,
    source VARCHAR(120) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    idempotency_key VARCHAR(191),
    imported_count INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    UNIQUE KEY uq_import_job_idempotency (source, idempotency_key)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
