CREATE DATABASE IF NOT EXISTS theway
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE theway;

-- =========================
-- TABLE: parametres
-- =========================
CREATE TABLE parametres (
    id_params CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    notification_email VARCHAR(255) DEFAULT 'enabled',
    notification_push VARCHAR(255) DEFAULT 'enabled',
    visibilite_profil VARCHAR(255) DEFAULT 'public',
    partage_donnees VARCHAR(255) DEFAULT 'disabled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- TABLE: notification
-- =========================
CREATE TABLE notification (
    id_notification CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    type VARCHAR(255),
    message VARCHAR(255),
    date_notification DATETIME DEFAULT CURRENT_TIMESTAMP,
    lu BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- TABLE: utilisateur
-- =========================
CREATE TABLE utilisateur (
    id_user CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_params CHAR(36),
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    telephone VARCHAR(255),
    localisation VARCHAR(255),
    photo VARCHAR(255),
    role ENUM('user', 'admin', 'recruiter') DEFAULT 'user',
    date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_parametres
        FOREIGN KEY (id_params)
        REFERENCES parametres(id_params)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- =========================
-- TABLE: user_notification
-- Relation utilisateur - notification
-- =========================
CREATE TABLE user_notification (
    id_user_notification CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_user CHAR(36) NOT NULL,
    id_notification CHAR(36) NOT NULL,

    CONSTRAINT fk_user_notification_user
        FOREIGN KEY (id_user)
        REFERENCES utilisateur(id_user)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_user_notification_notification
        FOREIGN KEY (id_notification)
        REFERENCES notification(id_notification)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================
-- TABLE: competence
-- =========================
CREATE TABLE competence (
    id_skill CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    nom VARCHAR(255) NOT NULL UNIQUE,
    categorie VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- TABLE: user_skill
-- =========================
CREATE TABLE user_skill (
    id_user_skill CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_user CHAR(36) NOT NULL,
    id_skill CHAR(36) NOT NULL,
    niveau VARCHAR(255),
    score INT DEFAULT 0,

    CONSTRAINT fk_user_skill_user
        FOREIGN KEY (id_user)
        REFERENCES utilisateur(id_user)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_user_skill_competence
        FOREIGN KEY (id_skill)
        REFERENCES competence(id_skill)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    UNIQUE (id_user, id_skill)
);

-- =========================
-- TABLE: progression
-- =========================
CREATE TABLE progression (
    id_progression CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_user CHAR(36) NOT NULL,
    score_globale INT DEFAULT 0,
    date_progression DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_progression_user
        FOREIGN KEY (id_user)
        REFERENCES utilisateur(id_user)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================
-- TABLE: entreprise
-- =========================
CREATE TABLE entreprise (
    id_entreprise CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    nom VARCHAR(255) NOT NULL,
    localisation VARCHAR(255),
    taille VARCHAR(255),
    secteur VARCHAR(255),
    site_web VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- TABLE: offre
-- =========================
CREATE TABLE offre (
    id_offre CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_entreprise CHAR(36),
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    localisation VARCHAR(255),
    type_contrat VARCHAR(255),
    date_publication DATETIME DEFAULT CURRENT_TIMESTAMP,
    source_url TEXT,
    source VARCHAR(100),
    skills TEXT,
    uid VARCHAR(64) UNIQUE,

    CONSTRAINT fk_offre_entreprise
        FOREIGN KEY (id_entreprise)
        REFERENCES entreprise(id_entreprise)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- =========================
-- TABLE: cv
-- =========================
CREATE TABLE cv (
    id_cv CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_user CHAR(36) NOT NULL,
    fichier VARCHAR(255),
    date_upload DATETIME DEFAULT CURRENT_TIMESTAMP,
    scann_analyse TEXT,

    CONSTRAINT fk_cv_user
        FOREIGN KEY (id_user)
        REFERENCES utilisateur(id_user)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================
-- TABLE: matching
-- =========================
CREATE TABLE matching (
    id_matching CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_user CHAR(36) NOT NULL,
    id_cv CHAR(36),
    id_offre CHAR(36) NOT NULL,
    score INT DEFAULT 0,
    date_matching DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_matching_user
        FOREIGN KEY (id_user)
        REFERENCES utilisateur(id_user)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_matching_cv
        FOREIGN KEY (id_cv)
        REFERENCES cv(id_cv)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_matching_offre
        FOREIGN KEY (id_offre)
        REFERENCES offre(id_offre)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    UNIQUE (id_user, id_offre)
);

-- =========================
-- TABLE: objectif
-- =========================
CREATE TABLE objectif (
    id_objectif CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_user CHAR(36) NOT NULL,
    id_skill CHAR(36),
    id_offre CHAR(36),
    titre VARCHAR(255) NOT NULL,
    progression INT DEFAULT 0,
    status ENUM('en_attente', 'en_cours', 'termine') DEFAULT 'en_attente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_objectif_user
        FOREIGN KEY (id_user)
        REFERENCES utilisateur(id_user)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_objectif_skill
        FOREIGN KEY (id_skill)
        REFERENCES competence(id_skill)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_objectif_offre
        FOREIGN KEY (id_offre)
        REFERENCES offre(id_offre)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- =========================
-- TABLE compatible avec ton scraper Python
-- =========================
CREATE TABLE opportunities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uid VARCHAR(64) UNIQUE,
    source VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    location VARCHAR(255),
    source_url TEXT,
    description TEXT,
    skills TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- INDEXES
-- =========================
CREATE INDEX idx_user_email ON utilisateur(email);
CREATE INDEX idx_offre_titre ON offre(titre);
CREATE INDEX idx_offre_location ON offre(localisation);
CREATE INDEX idx_opportunities_title ON opportunities(title);
CREATE INDEX idx_opportunities_source ON opportunities(source);
CREATE INDEX idx_matching_score ON matching(score);