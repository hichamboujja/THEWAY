-- MariaDB dump 10.19  Distrib 10.4.28-MariaDB, for osx10.10 (x86_64)
--
-- Host: localhost    Database: theway
-- ------------------------------------------------------
-- Server version	10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `competence`
--

DROP TABLE IF EXISTS `competence`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `competence` (
  `id_skill` char(36) NOT NULL DEFAULT uuid(),
  `nom` varchar(255) NOT NULL,
  `categorie` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_skill`),
  UNIQUE KEY `nom` (`nom`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cv`
--

DROP TABLE IF EXISTS `cv`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cv` (
  `id_cv` char(36) NOT NULL DEFAULT uuid(),
  `id_user` char(36) NOT NULL,
  `fichier` varchar(255) DEFAULT NULL,
  `date_upload` datetime DEFAULT current_timestamp(),
  `scann_analyse` text DEFAULT NULL,
  PRIMARY KEY (`id_cv`),
  KEY `fk_cv_user` (`id_user`),
  CONSTRAINT `fk_cv_user` FOREIGN KEY (`id_user`) REFERENCES `utilisateur` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `entreprise`
--

DROP TABLE IF EXISTS `entreprise`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `entreprise` (
  `id_entreprise` char(36) NOT NULL DEFAULT uuid(),
  `nom` varchar(255) NOT NULL,
  `localisation` varchar(255) DEFAULT NULL,
  `taille` varchar(255) DEFAULT NULL,
  `secteur` varchar(255) DEFAULT NULL,
  `site_web` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_entreprise`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `matching`
--

DROP TABLE IF EXISTS `matching`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `matching` (
  `id_matching` char(36) NOT NULL DEFAULT uuid(),
  `id_user` char(36) NOT NULL,
  `id_cv` char(36) DEFAULT NULL,
  `id_offre` char(36) NOT NULL,
  `score` int(11) DEFAULT 0,
  `date_matching` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_matching`),
  UNIQUE KEY `id_user` (`id_user`,`id_offre`),
  KEY `fk_matching_cv` (`id_cv`),
  KEY `fk_matching_offre` (`id_offre`),
  KEY `idx_matching_score` (`score`),
  CONSTRAINT `fk_matching_cv` FOREIGN KEY (`id_cv`) REFERENCES `cv` (`id_cv`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_matching_offre` FOREIGN KEY (`id_offre`) REFERENCES `offre` (`id_offre`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_matching_user` FOREIGN KEY (`id_user`) REFERENCES `utilisateur` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification`
--

DROP TABLE IF EXISTS `notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notification` (
  `id_notification` char(36) NOT NULL DEFAULT uuid(),
  `type` varchar(255) DEFAULT NULL,
  `message` varchar(255) DEFAULT NULL,
  `date_notification` datetime DEFAULT current_timestamp(),
  `lu` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_notification`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `objectif`
--

DROP TABLE IF EXISTS `objectif`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `objectif` (
  `id_objectif` char(36) NOT NULL DEFAULT uuid(),
  `id_user` char(36) NOT NULL,
  `id_skill` char(36) DEFAULT NULL,
  `id_offre` char(36) DEFAULT NULL,
  `titre` varchar(255) NOT NULL,
  `progression` int(11) DEFAULT 0,
  `status` enum('en_attente','en_cours','termine') DEFAULT 'en_attente',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_objectif`),
  KEY `fk_objectif_user` (`id_user`),
  KEY `fk_objectif_skill` (`id_skill`),
  KEY `fk_objectif_offre` (`id_offre`),
  CONSTRAINT `fk_objectif_offre` FOREIGN KEY (`id_offre`) REFERENCES `offre` (`id_offre`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_objectif_skill` FOREIGN KEY (`id_skill`) REFERENCES `competence` (`id_skill`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_objectif_user` FOREIGN KEY (`id_user`) REFERENCES `utilisateur` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `offre`
--

DROP TABLE IF EXISTS `offre`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `offre` (
  `id_offre` char(36) NOT NULL DEFAULT uuid(),
  `id_entreprise` char(36) DEFAULT NULL,
  `titre` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `localisation` varchar(255) DEFAULT NULL,
  `type_contrat` varchar(255) DEFAULT NULL,
  `date_publication` datetime DEFAULT current_timestamp(),
  `source_url` text DEFAULT NULL,
  `source` varchar(100) DEFAULT NULL,
  `skills` text DEFAULT NULL,
  `uid` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id_offre`),
  UNIQUE KEY `uid` (`uid`),
  KEY `fk_offre_entreprise` (`id_entreprise`),
  KEY `idx_offre_titre` (`titre`),
  KEY `idx_offre_location` (`localisation`),
  CONSTRAINT `fk_offre_entreprise` FOREIGN KEY (`id_entreprise`) REFERENCES `entreprise` (`id_entreprise`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `opportunities`
--

DROP TABLE IF EXISTS `opportunities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `opportunities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` varchar(64) DEFAULT NULL,
  `source` varchar(100) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `company` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `source_url` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `skills` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uid` (`uid`),
  KEY `idx_opportunities_title` (`title`),
  KEY `idx_opportunities_source` (`source`)
) ENGINE=InnoDB AUTO_INCREMENT=916 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parametres`
--

DROP TABLE IF EXISTS `parametres`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `parametres` (
  `id_params` char(36) NOT NULL DEFAULT uuid(),
  `notification_email` varchar(255) DEFAULT 'enabled',
  `notification_push` varchar(255) DEFAULT 'enabled',
  `visibilite_profil` varchar(255) DEFAULT 'public',
  `partage_donnees` varchar(255) DEFAULT 'disabled',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_params`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `progression`
--

DROP TABLE IF EXISTS `progression`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `progression` (
  `id_progression` char(36) NOT NULL DEFAULT uuid(),
  `id_user` char(36) NOT NULL,
  `score_globale` int(11) DEFAULT 0,
  `date_progression` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_progression`),
  KEY `fk_progression_user` (`id_user`),
  CONSTRAINT `fk_progression_user` FOREIGN KEY (`id_user`) REFERENCES `utilisateur` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_notification`
--

DROP TABLE IF EXISTS `user_notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_notification` (
  `id_user_notification` char(36) NOT NULL DEFAULT uuid(),
  `id_user` char(36) NOT NULL,
  `id_notification` char(36) NOT NULL,
  PRIMARY KEY (`id_user_notification`),
  KEY `fk_user_notification_user` (`id_user`),
  KEY `fk_user_notification_notification` (`id_notification`),
  CONSTRAINT `fk_user_notification_notification` FOREIGN KEY (`id_notification`) REFERENCES `notification` (`id_notification`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_notification_user` FOREIGN KEY (`id_user`) REFERENCES `utilisateur` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_skill`
--

DROP TABLE IF EXISTS `user_skill`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_skill` (
  `id_user_skill` char(36) NOT NULL DEFAULT uuid(),
  `id_user` char(36) NOT NULL,
  `id_skill` char(36) NOT NULL,
  `niveau` varchar(255) DEFAULT NULL,
  `score` int(11) DEFAULT 0,
  PRIMARY KEY (`id_user_skill`),
  UNIQUE KEY `id_user` (`id_user`,`id_skill`),
  KEY `fk_user_skill_competence` (`id_skill`),
  CONSTRAINT `fk_user_skill_competence` FOREIGN KEY (`id_skill`) REFERENCES `competence` (`id_skill`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_skill_user` FOREIGN KEY (`id_user`) REFERENCES `utilisateur` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `utilisateur`
--

DROP TABLE IF EXISTS `utilisateur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `utilisateur` (
  `id_user` char(36) NOT NULL DEFAULT uuid(),
  `id_params` char(36) DEFAULT NULL,
  `nom` varchar(255) NOT NULL,
  `prenom` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `telephone` varchar(255) DEFAULT NULL,
  `localisation` varchar(255) DEFAULT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `role` enum('user','admin','recruiter') DEFAULT 'user',
  `date_inscription` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_user_parametres` (`id_params`),
  KEY `idx_user_email` (`email`),
  CONSTRAINT `fk_user_parametres` FOREIGN KEY (`id_params`) REFERENCES `parametres` (`id_params`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-13  9:41:06
