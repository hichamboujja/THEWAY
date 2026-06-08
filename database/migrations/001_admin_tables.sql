USE theway;

CREATE TABLE IF NOT EXISTS abonnement (
    id_abonnement CHAR(36) PRIMARY KEY,
    id_entreprise CHAR(36),
    plan VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_abonnement_entreprise
        FOREIGN KEY (id_entreprise)
        REFERENCES entreprise(id_entreprise)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS support_ticket (
    id_ticket CHAR(36) PRIMARY KEY,
    id_user CHAR(36),
    subject VARCHAR(255) NOT NULL,
    message TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    priority VARCHAR(50) NOT NULL DEFAULT 'normal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_support_ticket_user
        FOREIGN KEY (id_user)
        REFERENCES utilisateur(id_user)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
