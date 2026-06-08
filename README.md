# TheWay

TheWay est une plateforme SaaS CareerTech pour aider les candidats à améliorer leur profil, analyser leur CV, suivre leurs compétences et trouver les meilleures opportunités grâce au matching intelligent.

Le produit combine un espace candidat, un espace administrateur, une API sécurisée, une base MySQL, un système de fichiers local ou S3, des widgets de progression, un suivi des candidatures et des outils d'administration.

## Sommaire

- [Vision du SaaS](#vision-du-saas)
- [Fonctionnalités](#fonctionnalites)
- [Parcours utilisateur](#parcours-utilisateur)
- [Parcours administrateur](#parcours-administrateur)
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Structure du projet](#structure-du-projet)
- [Installation locale](#installation-locale)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données](#base-de-donnees)
- [Commandes utiles](#commandes-utiles)
- [Routes frontend](#routes-frontend)
- [API backend](#api-backend)
- [Sécurité](#securite)
- [Stockage des fichiers](#stockage-des-fichiers)
- [Tests et qualité](#tests-et-qualite)
- [Déploiement](#deploiement)
- [Roadmap](#roadmap)

## Vision du SaaS

TheWay aide un candidat à passer de "j'ai un CV" à "je sais quelles compétences améliorer et quelles offres viser".

Le SaaS répond à quatre problèmes :

- Comprendre la qualité réelle du profil candidat.
- Identifier les compétences manquantes selon le marché.
- Matcher les offres avec le CV et les compétences.
- Donner à l'administrateur une vue claire sur les utilisateurs, offres, skills, support et activité.

Positionnement possible :

> TheWay is an AI-powered CareerTech SaaS for CV analysis, competency progression and opportunity matching.

## Fonctionnalités

### Candidat

- Inscription, connexion et session sécurisée.
- Dashboard candidat avec widgets de progression.
- Upload et gestion du CV.
- Analyse CV : lisibilité, structure, mots-clés, préparation ATS et recommandations.
- Gestion des compétences avec progression.
- Matching intelligent entre profil candidat et opportunités.
- Explication des résultats de matching.
- Recherche et filtrage des opportunités.
- Sauvegarde d'offres.
- Candidature à une offre.
- Pipeline de candidatures : sauvegardées, à candidater, postulées, en cours.
- Paramètres profil avec photo, identité, contact, localisation et préférences.
- Notifications liées au CV, matching, offres et messages admin.

### Admin

- Dashboard admin avec statistiques globales.
- Gestion des utilisateurs.
- Gestion des offres.
- Gestion des compétences.
- Gestion support.
- Gestion billing / subscriptions.
- Gestion rôles et permissions.
- Suivi qualité des offres.
- Suivi de croissance utilisateurs.
- Suivi activité récente.

### Widgets principaux

Dashboard candidat :

- `ProfileCompletenessWidget`
- `NextBestActionWidget`
- `CareerScoreWidget`
- `RecommendedOpportunitiesWidget`
- `SkillGapWidget`
- `ApplicationPipelineWidget`
- `SavedOpportunitiesWidget`
- `MarketInsightsWidget`
- `NotificationCenterWidget`
- `AIJobCoachWidget`

CV :

- `CVUploadBox`
- `CVCurrentFileCard`
- `CVHealthWidget`
- `CVAnalysisPanel`
- `ExtractedSkillsList`

Matching :

- `MatchingRunPanel`
- `MatchingExplainabilityWidget`
- `MatchingResultCard`
- `SkillGapWidget`

Opportunités :

- `SmartSearchBar`
- `OpportunityFilters`
- `OpportunityCard`
- `OpportunityBookmarkButton`
- `OpportunityApplyButton`

Admin :

- `AdminStatsGrid`
- `ScraperStatusWidget`
- `UserGrowthWidget`
- `OfferQualityWidget`
- `AdminActivityFeed`

## Parcours utilisateur

1. Le candidat crée un compte.
2. Il complète son profil dans les paramètres.
3. Il ajoute une photo et ses informations de contact.
4. Il importe son CV.
5. Il lance l'analyse CV.
6. TheWay extrait ou suggère des compétences.
7. Le candidat améliore ses compétences via la progression.
8. Il lance le matching.
9. Il consulte les opportunités recommandées.
10. Il sauvegarde les offres intéressantes.
11. Il postule.
12. Il suit son pipeline dans le dashboard.

## Parcours administrateur

1. L'admin se connecte avec un compte admin.
2. Il consulte la santé générale de la plateforme.
3. Il gère les utilisateurs et rôles.
4. Il contrôle les offres importées ou créées.
5. Il vérifie la qualité des offres.
6. Il gère les compétences du marché.
7. Il traite les tickets support.
8. Il suit les abonnements, factures et demandes d'upgrade.

## Architecture

TheWay est organisé comme un monorepo :

```text
THEWAY/
  API/                 Backend Express
  frontend-react/      Frontend React + Vite
  database/            SQL schema + migrations
  assets/              Images, CSS/JS legacy, fichiers importés
  storage/             Uploads locaux
  scraping.py          Script de scraping d'opportunités
  start-dev.ps1        Lancement local API + frontend
  package.json         Scripts racine
```

Flux général :

```text
React frontend
  -> Axios client
  -> Express API
  -> MySQL
  -> storage local ou S3
```

## Stack technique

Frontend :

- React 18
- Vite
- React Router
- Axios
- Lucide React
- CSS Modules

Backend :

- Node.js 20+
- Express
- MySQL2
- Express Session
- Argon2
- Helmet
- CORS
- Multer
- Zod
- Pino
- OpenTelemetry
- Nodemailer
- PDF/DOC parsing avec `pdf-parse` et `mammoth`

Base de données :

- MySQL
- Migrations SQL
- Tables métier candidat, admin, billing, support, matching et audit

## Structure du projet

### Backend

```text
API/
  app.js                 Configuration Express et montage des routes
  server.js              Démarrage serveur
  lib/                   Config, DB, logger, migrations, rate limit, storage
  middleware/            Auth, CSRF, rôles
  routes/                Routes publiques et candidat
  routes/admin/          Routes admin
  services/              Auth, CV, AI, email, audit, storage
  scripts/               migrate, seed, lint, typecheck
  tests/                 Unit, integration, e2e
```

### Frontend

```text
frontend-react/src/
  api/                   Clients API
  components/            UI, layout, dashboard, CV, matching, admin
  context/               Auth context
  hooks/                 Hooks applicatifs
  pages/                 Pages index, auth, user, admin
  router/                Routing React
  styles/                Design system global
```

## Installation locale

### Prérequis

- Node.js 20 ou plus
- npm
- MySQL 8 ou compatible
- PowerShell sur Windows si vous utilisez `start-dev.ps1`

### 1. Installer les dépendances

Depuis la racine :

```bash
npm install
npm --prefix API install
npm --prefix frontend-react install
```

### 2. Configurer l'environnement

Copier `.env.example` vers `.env` :

```bash
cp .env.example .env
```

Sur Windows PowerShell :

```powershell
Copy-Item .env.example .env
```

Adapter les valeurs MySQL :

```env
NODE_ENV=development
PORT=3001
APP_BASE_URL=http://localhost:3001
CLIENT_BASE_URL=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=theway
```

### 3. Créer la base MySQL

```sql
CREATE DATABASE theway CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Exécuter les migrations

```bash
npm run migrate
```

### 5. Ajouter les données initiales

```bash
npm run seed
```

En développement, le seed peut créer un admin local :

```text
Email: admin@theway.local
Password: ChangeMe12345!
```

### 6. Lancer le projet

Option simple sur Windows :

```powershell
.\start-dev.ps1
```

Ou lancer séparément :

```bash
npm run dev:api
npm run dev:frontend
```

URLs locales :

- Frontend : `http://localhost:5173`
- API : `http://localhost:3001`
- Health API : `http://localhost:3001/health`

## Variables d'environnement

Variables principales :

| Variable | Description | Exemple |
| --- | --- | --- |
| `NODE_ENV` | Environnement | `development` |
| `PORT` | Port API | `3001` |
| `APP_BASE_URL` | URL backend | `http://localhost:3001` |
| `CLIENT_BASE_URL` | URL frontend | `http://localhost:5173` |
| `DB_HOST` | Host MySQL | `localhost` |
| `DB_PORT` | Port MySQL | `3306` |
| `DB_USER` | Utilisateur MySQL | `root` |
| `DB_PASSWORD` | Mot de passe MySQL | vide en local possible |
| `DB_NAME` | Nom base | `theway` |
| `COOKIE_SECRET` | Secret cookies | requis en production |
| `CSRF_SECRET` | Secret CSRF | requis en production |
| `CORS_ORIGIN` | Origines autorisées | `https://app.example.com` |
| `MAX_FILE_SIZE` | Taille upload max | `20971520` |
| `STORAGE_DRIVER` | Stockage fichiers | `local` ou `s3` |
| `LOCAL_UPLOAD_DIR` | Dossier uploads local | `storage/uploads` |
| `AI_PROVIDER` | Provider IA optionnel | `openai`, `custom`, etc. |
| `AI_API_KEY` | Clé IA optionnelle | secret |
| `MAIL_PROVIDER` | Provider email | `smtp` |
| `SMTP_HOST` | Serveur SMTP | `smtp.example.com` |
| `BOOTSTRAP_ADMIN_EMAIL` | Admin initial | `admin@example.com` |
| `BOOTSTRAP_ADMIN_PASSWORD` | Mot de passe admin initial | secret |

En production, définir au minimum :

- `DB_PASSWORD`
- `COOKIE_SECRET`
- `CSRF_SECRET`
- `CORS_ORIGIN`
- `APP_BASE_URL`
- `CLIENT_BASE_URL`

## Base de données

Les fichiers SQL sont dans `database/`.

Migrations :

- `001_admin_tables.sql` : tables admin historiques.
- `002_production_core.sql` : rôles, permissions, sessions, fichiers, sauvegardes, candidatures, CV analysis, matching, billing, settings, audit, imports.

Tables métier principales :

- `utilisateur`
- `competence`
- `user_skill`
- `progression`
- `cv`
- `cv_analysis`
- `opportunities`
- `offre`
- `saved_opportunity`
- `application`
- `matching_run`
- `matching_result`
- `notification`
- `support_ticket`
- `roles`
- `permissions`
- `user_roles`
- `billing_subscription`
- `billing_invoice`
- `plan_catalogue`
- `audit_log`

## Commandes utiles

Depuis la racine :

```bash
npm run dev:api
npm run dev:frontend
npm run build:frontend
npm run start:api
npm run migrate
npm run seed
```

Depuis `API/` :

```bash
npm run dev
npm start
npm run migrate
npm run seed
npm run build
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

Depuis `frontend-react/` :

```bash
npm run dev
npm run build
npm run preview
```

## Routes frontend

Publiques :

- `/` : landing page moderne avec login/register.
- `/login` : connexion.
- `/register` : inscription.

Espace candidat :

- `/dashboard` : dashboard candidat.
- `/opportunities` : recherche et offres.
- `/opportunities/:id` : détail offre.
- `/skills` : compétences et progression.
- `/cv` : upload et analyse CV.
- `/matching` : matching candidat/offres.
- `/settings` : paramètres utilisateur.

Espace admin :

- `/admin` : dashboard admin.
- `/admin/users` : utilisateurs.
- `/admin/offers` : offres.
- `/admin/skills` : compétences admin.
- `/admin/support` : support.
- `/admin/billing` : billing.
- `/admin/settings` : rôles et paramètres.

## API backend

### Auth

| Méthode | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/auth/session` | Lire la session courante |
| `POST` | `/api/auth/register` | Créer un compte |
| `POST` | `/api/auth/login` | Se connecter |
| `POST` | `/api/auth/logout` | Se déconnecter |
| `POST` | `/api/auth/password-reset/request` | Demander reset password |
| `POST` | `/api/auth/password-reset/confirm` | Confirmer reset password |

### Profil et compte

| Méthode | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/profile` | Profil utilisateur |
| `PUT` | `/api/profile` | Mettre à jour profil |
| `PUT` | `/api/account/password` | Changer mot de passe |
| `PUT` | `/api/account/email` | Changer email |
| `GET` | `/api/settings/user` | Lire paramètres user |
| `PUT` | `/api/settings/user` | Modifier paramètres user |

### Opportunités

| Méthode | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/opportunities` | Liste opportunités |
| `GET` | `/api/opportunities/:id` | Détail opportunité |
| `POST` | `/api/opportunities/:id/bookmark` | Sauvegarder offre |
| `DELETE` | `/api/opportunities/:id/bookmark` | Retirer sauvegarde |
| `POST` | `/api/opportunities/:id/applications` | Postuler |

### Compétences

| Méthode | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/skills` | Liste compétences utilisateur |
| `POST` | `/api/skills` | Ajouter compétence |
| `PUT` | `/api/skills/:id` | Modifier compétence |
| `DELETE` | `/api/skills/:id` | Supprimer compétence |

### CV et fichiers

| Méthode | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/cv` | Upload CV |
| `GET` | `/api/cv/current` | CV courant |
| `POST` | `/api/cv/:id/analyse` | Analyser CV |
| `POST` | `/api/files/presign` | Préparer upload fichier |
| `POST` | `/api/files/:id/content` | Envoyer contenu fichier |
| `POST` | `/api/files/complete` | Marquer upload terminé |
| `GET` | `/api/files/:id` | Télécharger/afficher fichier |
| `DELETE` | `/api/files/:id/delete` | Supprimer fichier |

### Matching

| Méthode | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/matching/run` | Lancer matching |
| `GET` | `/api/matching` | Liste runs/résultats |
| `GET` | `/api/matching/:id` | Détail matching |

### Notifications, support et billing

| Méthode | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/notifications` | Notifications utilisateur |
| `PUT` | `/api/notifications/:id` | Marquer notification |
| `GET` | `/api/support/tickets` | Tickets utilisateur |
| `POST` | `/api/support/tickets` | Créer ticket |
| `POST` | `/api/billing/upgrade-request` | Demander upgrade |
| `GET` | `/api/plans` | Plans disponibles |

### Admin

| Méthode | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/admin/dashboard` | Dashboard admin |
| `GET` | `/api/admin/users` | Liste utilisateurs |
| `POST` | `/api/admin/users` | Créer utilisateur |
| `PUT` | `/api/admin/users/:id` | Modifier utilisateur |
| `DELETE` | `/api/admin/users/:id` | Supprimer utilisateur |
| `GET` | `/api/admin/offers` | Liste offres admin |
| `POST` | `/api/admin/offers` | Créer offre |
| `PUT` | `/api/admin/offers/:id` | Modifier offre |
| `DELETE` | `/api/admin/offers/:id` | Supprimer offre |
| `GET` | `/api/admin/skills` | Skills admin |
| `POST` | `/api/admin/skills` | Créer skill |
| `PUT` | `/api/admin/skills/:id` | Modifier skill |
| `DELETE` | `/api/admin/skills/:id` | Supprimer skill |
| `GET` | `/api/admin/support` | Tickets support |
| `POST` | `/api/admin/support` | Créer ticket admin |
| `PUT` | `/api/admin/support/:id` | Modifier ticket |
| `DELETE` | `/api/admin/support/:id` | Supprimer ticket |
| `GET` | `/api/admin/subscriptions` | Subscriptions |
| `GET` | `/api/admin/settings` | Settings admin |
| `PUT` | `/api/admin/settings` | Modifier settings admin |
| `GET` | `/api/admin/roles` | Rôles |
| `PUT` | `/api/admin/roles/:role/permissions` | Permissions rôle |
| `GET` | `/api/docs/openapi.json` | Documentation OpenAPI |

## Sécurité

La plateforme inclut :

- Sessions HTTP-only avec `express-session`.
- Store session MySQL.
- Hash mot de passe avec Argon2.
- Protection CSRF.
- CORS contrôlé par environnement.
- Helmet pour headers de sécurité.
- Rate limiting par type d'action.
- Rôles et permissions.
- Middleware admin pour les routes sensibles.
- Audit log pour les actions importantes.
- Validation côté API avec Zod et validations Express.

Bonnes pratiques production :

- Utiliser HTTPS.
- Définir `COOKIE_SECRET` et `CSRF_SECRET` forts.
- Restreindre `CORS_ORIGIN`.
- Utiliser un utilisateur MySQL dédié.
- Activer backups base de données.
- Stocker les fichiers sensibles sur S3 ou stockage compatible.
- Ne jamais commiter `.env`.

## Stockage des fichiers

TheWay supporte :

- Stockage local : `storage/uploads`
- Stockage S3 via variables `S3_*`

Types autorisés par défaut :

- PDF
- DOC / DOCX
- PNG / JPG / JPEG / WEBP
- CSV
- TXT

Usage actuel :

- Upload CV.
- Upload photo profil.
- Téléchargement fichiers via `/api/files/:id`.

## Scraping opportunités

Le fichier `scraping.py` sert à collecter ou préparer des opportunités externes.

Les données importées peuvent être stockées dans :

```text
assets/uploads/files/opportunities.json
assets/uploads/files/opportunities.csv
```

L'objectif est d'alimenter le catalogue d'opportunités utilisé par :

- la page opportunités,
- le matching,
- les insights marché,
- les widgets admin de qualité.

## Tests et qualité

Backend :

- Unit tests : `API/tests/unit`
- Integration tests : `API/tests/integration`
- E2E tests : `API/tests/e2e`
- Scripts qualité : lint, typecheck, static check

Commandes :

```bash
cd API
npm test
npm run test:e2e
npm run lint
npm run typecheck
npm run build
```

Frontend :

```bash
cd frontend-react
npm run build
```

## Déploiement

### Backend

1. Installer dépendances en production.
2. Configurer variables d'environnement.
3. Exécuter migrations.
4. Exécuter seed si nécessaire.
5. Démarrer `node server.js` derrière un reverse proxy.

Exemple :

```bash
cd API
npm ci --omit=dev
npm run migrate
npm run seed
npm start
```

### Frontend

```bash
cd frontend-react
npm ci
npm run build
```

Le dossier généré est :

```text
frontend-react/dist
```

Il peut être servi par Nginx, Apache, Vercel, Netlify ou un serveur statique.

### Production checklist

- Domaine frontend configuré.
- Domaine API configuré.
- `CLIENT_BASE_URL` et `APP_BASE_URL` corrects.
- `CORS_ORIGIN` limité au frontend.
- Secrets forts.
- MySQL sécurisé.
- Backups activés.
- Logs monitorés.
- Limites upload vérifiées.
- S3 configuré si stockage distant.

## Roadmap

Améliorations produit possibles :

- Paiement réel Stripe ou autre provider.
- IA conversationnelle complète pour `AIJobCoachWidget`.
- Scraping planifié avec suivi des sources.
- Score ATS plus avancé.
- Recommandations de formations pour combler les skill gaps.
- Emails transactionnels pour matching, support, billing.
- Tableaux de bord recruteurs.
- Import LinkedIn.
- OpenAPI enrichi et Swagger UI.
- Tests frontend avec Playwright.
- Docker Compose pour API, frontend et MySQL.

## Résumé

TheWay est un SaaS CareerTech complet avec :

- une landing page moderne,
- un espace candidat,
- un espace administrateur,
- une API sécurisée,
- une base MySQL structurée,
- des uploads CV/photo,
- un système de matching,
- des widgets de progression,
- des fonctions support et billing.

Le projet est prêt à évoluer vers une plateforme SaaS commercialisable avec abonnements, IA plus poussée, monitoring et déploiement cloud.
