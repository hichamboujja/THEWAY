# Analyse Codex - TheWay Platform

## 1. Resume Executif

TheWay est une plateforme de matching entre candidats, competences et opportunites professionnelles. Le projet contient deja une base solide :

- Frontend statique en HTML/CSS/JavaScript dans `view/` et `assets/`.
- Backend Node.js/Express dans `API/`.
- Base de donnees MySQL avec migrations SQL.
- Authentification par session HttpOnly, CSRF, roles et permissions.
- Upload de CV, analyse IA et matching candidat/offre.
- Espace candidat et espace administrateur.
- Documentation existante : `README.md`, `ARCHITECTURE.md`, `API_DOCUMENTATION.md`, `DESIGN_SYSTEM.md`.

Le principal enjeu de reconstruction n'est pas le backend, mais la modularisation du frontend. Beaucoup de pages definissent leur propre layout, leurs variables CSS et leurs composants localement. Pour reconstruire proprement, il faut transformer l'interface actuelle en widgets reutilisables.

---

## 2. Stack Observee

| Couche | Technologie |
|---|---|
| Frontend | HTML statique, CSS, JavaScript vanilla |
| Backend | Node.js, Express CommonJS |
| Base de donnees | MySQL via `mysql2/promise` |
| Auth | `express-session`, cookies HttpOnly, CSRF |
| Securite | Helmet, rate limiting, Argon2id, RBAC |
| Upload | Stockage local ou S3-compatible |
| IA | Provider OpenAI-compatible |
| Tests | Jest, Supertest, Playwright |
| Docker | `Dockerfile`, `docker-compose.yml` |

---

## 3. Structure Du Projet

```text
TheWay-platforme/
  API/
    app.js
    server.js
    routes/
    middleware/
    services/
    lib/
    tests/
  assets/
    css/
    js/
    images/
    uploads/
  database/
    migrations/
    database.sql
  view/
    public/
    authentification/
    pannel/
      admin/
      settings/
  Python/
    scraping.py
```

Observations importantes :

- `assets/` et `view/assets/` semblent contenir des fichiers dupliques.
- Les pages HTML contiennent beaucoup de CSS inline ou embarque.
- Le design system existe dans `assets/css/design-system.css`, mais il n'est pas encore applique uniformement.
- Les scripts JS partages dans `assets/js/` sont deja un bon debut de couche frontend commune.
- Le dossier `API/routes/production.js` concentre beaucoup de routes modernes et semble etre la reference principale.

---

## 4. Fonctionnalites Principales

### Cote utilisateur

- Inscription et connexion.
- Session utilisateur.
- Gestion du profil.
- Upload de CV.
- Analyse IA du CV.
- Gestion des competences.
- Consultation des opportunites.
- Sauvegarde/bookmark d'une opportunite.
- Candidature a une opportunite.
- Lancement d'un matching IA.
- Consultation des resultats de matching.
- Parametres utilisateur.
- Notifications.
- Support.

### Cote administrateur

- Tableau de bord global.
- Gestion des utilisateurs.
- Gestion des entreprises.
- Gestion des offres.
- Gestion des competences.
- Matching et analytics.
- Gestion des abonnements.
- Gestion du support.
- Parametres systeme.
- Roles et permissions.
- Notifications.
- Factures et demandes d'upgrade.

---

## 5. Analyse Backend

Le backend est plutot bien structure. Les zones principales sont :

| Zone | Role |
|---|---|
| `API/app.js` | Construction de l'application Express |
| `API/server.js` | Demarrage serveur |
| `API/lib/config.js` | Configuration environnement |
| `API/lib/db.js` | Connexion MySQL |
| `API/lib/response.js` | Format standard des reponses |
| `API/middleware/auth.js` | Auth, session, CSRF, droits |
| `API/services/aiService.js` | Appels LLM |
| `API/services/storageService.js` | Stockage fichiers |
| `API/services/cvTextService.js` | Extraction texte CV |
| `API/routes/production.js` | Routes production principales |

Format API documente :

```json
{ "ok": true, "data": {}, "requestId": "uuid" }
```

Erreurs :

```json
{ "ok": false, "error": { "code": "error_code", "message": "Message" }, "requestId": "uuid" }
```

Routes importantes :

| Methode | Route | Usage |
|---|---|---|
| `GET` | `/api/auth/session` | Session courante + CSRF |
| `POST` | `/api/auth/register` | Inscription |
| `POST` | `/api/auth/login` | Connexion |
| `POST` | `/api/auth/logout` | Deconnexion |
| `GET` | `/api/opportunities` | Liste/recherche offres |
| `POST` | `/api/opportunities/:id/bookmark` | Sauvegarder offre |
| `POST` | `/api/opportunities/:id/applications` | Postuler |
| `POST` | `/api/cv` | Upload CV |
| `POST` | `/api/cv/:id/analyse` | Analyse IA CV |
| `POST` | `/api/matching/run` | Lancer matching |
| `GET` | `/api/matching` | Resultats matching |
| `GET/PUT` | `/api/profile` | Profil utilisateur |
| `GET/POST/PUT/DELETE` | `/api/skills` | Competences utilisateur |
| `GET` | `/api/admin/dashboard` | Dashboard admin |
| `GET/POST/PUT/DELETE` | `/api/admin/users` | Gestion utilisateurs |
| `GET/POST/PUT/DELETE` | `/api/admin/offers` | Gestion offres |
| `GET/POST/PUT/DELETE` | `/api/admin/skills` | Gestion competences |

Conclusion backend : conserver l'API, clarifier les routes en double, et reconstruire surtout le frontend autour de contrats API propres.

---

## 6. Analyse Frontend

Le frontend actuel fonctionne comme un ensemble de pages statiques. Chaque page contient souvent :

- Un layout complet.
- Une sidebar.
- Une topbar.
- Des styles propres a la page.
- Des composants HTML repetes.

Cela rend la maintenance difficile. Pour reconstruire, il faut isoler :

- Le layout global.
- Les composants UI generiques.
- Les composants metier.
- Les pages qui assemblent ces widgets.

Le design system doit devenir la source unique de verite :

- Couleurs.
- Typographie.
- Espacements.
- Ombres.
- Rayons.
- Boutons.
- Formulaires.
- Cards.
- Badges.
- Tableaux.

---

## 7. Widgets Recommandes Pour La Reconstruction

### A. Widgets de layout

| Widget | Description |
|---|---|
| `AppShell` | Layout global avec sidebar, topbar et zone contenu |
| `SidebarNavigation` | Navigation principale utilisateur/admin |
| `SidebarNavItem` | Element de menu avec icone et etat actif |
| `TopHeader` | Barre superieure avec titre, actions, profil |
| `PageHeader` | Titre de page, sous-titre, actions principales |
| `ContentSection` | Section de contenu standardisee |
| `ResponsiveGrid` | Grille responsive pour cards et stats |
| `MobileOverlayMenu` | Menu mobile pour la sidebar |

### B. Widgets d'authentification

| Widget | Description |
|---|---|
| `AuthLayout` | Layout split pour login/register |
| `LoginForm` | Connexion email/mot de passe |
| `RegisterForm` | Creation de compte |
| `PasswordResetForm` | Demande de recuperation |
| `SocialLoginButtons` | Google, LinkedIn, GitHub si conserves |
| `SessionGuard` | Redirection si utilisateur non connecte |
| `RoleGuard` | Protection admin/user |

### C. Widgets generiques UI

| Widget | Description |
|---|---|
| `Button` | Variants primary, secondary, ghost, danger |
| `IconButton` | Bouton icone pour actions compactes |
| `Badge` | Label visuel simple |
| `StatusBadge` | Actif, inactif, pending, error, success |
| `Card` | Conteneur de base |
| `StatCard` | KPI avec valeur, label, icone |
| `TrendCard` | KPI avec evolution |
| `Tabs` | Navigation interne |
| `SegmentedControl` | Filtre par mode/type |
| `DropdownMenu` | Menu d'actions |
| `ActionMenu` | Voir, modifier, supprimer |
| `Modal` | Modale standard |
| `ConfirmDialog` | Confirmation d'action sensible |
| `ToastCenter` | Notifications globales |
| `EmptyState` | Etat vide |
| `LoadingState` | Chargement/skeleton |
| `ErrorState` | Erreur avec action retry |

### D. Widgets formulaires

| Widget | Description |
|---|---|
| `TextInput` | Champ texte standard |
| `PasswordInput` | Mot de passe avec affichage/masquage |
| `SelectInput` | Select simple |
| `SearchInput` | Recherche avec icone |
| `TextareaInput` | Description/message |
| `Checkbox` | Option booleenne |
| `Toggle` | Parametre on/off |
| `FileDropzone` | Upload drag and drop |
| `FormModal` | Creation/modification dans une modale |
| `ValidationMessage` | Erreurs de formulaire |

### E. Widgets donnees et tableaux

| Widget | Description |
|---|---|
| `DataTable` | Tableau reutilisable admin |
| `TableToolbar` | Recherche, filtres, export, creation |
| `TablePagination` | Pagination |
| `SortableHeader` | Colonnes triables |
| `FilterBar` | Barre de filtres |
| `BulkActions` | Actions groupees |
| `ExportButton` | Export CSV/JSON |
| `RowActions` | Actions par ligne |

### F. Widgets opportunites

| Widget | Description |
|---|---|
| `OpportunityCard` | Carte offre avec entreprise, lieu, tags, score |
| `OpportunityList` | Liste/grid des opportunites |
| `OpportunityDetails` | Page detail d'une offre |
| `OpportunityFilters` | Filtres : recherche, lieu, contrat, source |
| `OpportunityBookmarkButton` | Sauvegarde d'offre |
| `OpportunityApplyButton` | Candidature |
| `OpportunityMeta` | Entreprise, lieu, type contrat, source |
| `CompanyAvatar` | Initiale/logo entreprise |
| `SkillTagList` | Tags de competences |

### G. Widgets competences

| Widget | Description |
|---|---|
| `SkillTag` | Tag competence |
| `SkillCard` | Competence avec categorie et niveau |
| `SkillLevelBar` | Barre de niveau |
| `SkillEditor` | Ajouter/modifier/supprimer competence |
| `SkillCategoryFilter` | Filtre par categorie |
| `SkillImportPanel` | Import depuis CV ou fichier |

### H. Widgets CV et IA

| Widget | Description |
|---|---|
| `CVUploadBox` | Upload CV PDF/DOCX |
| `CVCurrentFileCard` | CV actuel, date, statut |
| `CVAnalysisPanel` | Resultats d'analyse IA |
| `ExtractedSkillsList` | Competences extraites du CV |
| `AIStatusBanner` | Provider IA configure/non configure |
| `MatchingRunPanel` | Lancer un matching |
| `MatchingResultCard` | Resultat par offre |
| `MatchScoreCircle` | Score circulaire 0-100 |
| `MatchedMissingSkills` | Competences trouvees/manquantes |

### I. Widgets dashboard utilisateur

| Widget | Description |
|---|---|
| `UserDashboardSummary` | Resume candidat |
| `RecommendedOpportunities` | Offres recommandees |
| `ProfileCompleteness` | Progression profil |
| `RecentActivityFeed` | Activites recentes |
| `SavedOpportunitiesPreview` | Offres sauvegardees |
| `NextActionPanel` | Prochaine action conseillee |

### J. Widgets admin

| Widget | Description |
|---|---|
| `AdminDashboardSummary` | Vue globale admin |
| `AdminStatsGrid` | KPI admin |
| `UsersTable` | Gestion utilisateurs |
| `UserFormModal` | Creation/modification utilisateur |
| `EnterpriseTable` | Gestion entreprises |
| `EnterpriseFormModal` | Formulaire entreprise |
| `OfferTable` | Gestion offres |
| `OfferFormModal` | Formulaire offre |
| `SubscriptionTable` | Gestion abonnements |
| `SubscriptionCard` | Resume abonnement |
| `SupportTicketTable` | Tickets support |
| `SupportTicketDetail` | Detail/reponse ticket |
| `RolePermissionMatrix` | Roles et permissions |
| `AdminSettingsForm` | Parametres systeme |
| `AuditLogTable` | Journal d'audit |

### K. Widgets settings

| Widget | Description |
|---|---|
| `SettingsLayout` | Layout des parametres |
| `SettingsSidebar` | Navigation parametres |
| `ProfileSettingsForm` | Profil |
| `AccountSettingsForm` | Email, mot de passe |
| `NotificationSettingsForm` | Preferences notifications |
| `PrivacySettingsForm` | Confidentialite |
| `IntegrationCard` | Connexion service externe |
| `DangerZone` | Suppression compte/actions sensibles |

---

## 8. Priorites De Reconstruction

### Phase 1 - Fondations UI

1. Nettoyer `design-system.css`.
2. Creer `components.css`.
3. Standardiser boutons, cards, badges, formulaires.
4. Creer `AppShell`, `SidebarNavigation`, `TopHeader`.
5. Supprimer les variables CSS dupliquees dans les pages.

### Phase 2 - Widgets metier utilisateur

1. `OpportunityCard`.
2. `OpportunityList`.
3. `OpportunityDetails`.
4. `SkillEditor`.
5. `CVUploadBox`.
6. `MatchingRunPanel`.
7. `MatchingResultCard`.

### Phase 3 - Widgets admin

1. `DataTable`.
2. `TableToolbar`.
3. `FormModal`.
4. `ConfirmDialog`.
5. `UsersTable`.
6. `OfferTable`.
7. `EnterpriseTable`.
8. `SubscriptionTable`.
9. `SupportTicketTable`.

### Phase 4 - Integration API

1. Centraliser les appels dans `assets/js/api/`.
2. Normaliser les erreurs.
3. Gerer CSRF automatiquement.
4. Gerer loading/error/empty states.
5. Ajouter tests Playwright sur les parcours critiques.

---

## 9. Structure Frontend Recommandee

Si le projet reste en HTML/CSS/JS vanilla :

```text
assets/
  css/
    design-system.css
    components.css
    pages.css
  js/
    api/
      client.js
      auth.js
      opportunities.js
      skills.js
      cv.js
      matching.js
      admin.js
    components/
      app-shell.js
      sidebar-navigation.js
      top-header.js
      stat-card.js
      data-table.js
      modal.js
      toast-center.js
      opportunity-card.js
      cv-upload-box.js
      match-score-circle.js
    pages/
      dashboard.js
      opportunities.js
      opportunity-details.js
      skills.js
      matching.js
      admin-dashboard.js
      admin-users.js
      admin-offers.js
```

Si le projet est reconstruit avec React, Vue ou Svelte, les memes widgets peuvent devenir des composants natifs.

---

## 10. Modeles De Donnees Frontend

### Opportunity

```js
{
  id: "uuid",
  title: "Developpeur Full Stack",
  company: "Entreprise",
  location: "Paris",
  contract_type: "CDI",
  source: "LinkedIn",
  source_url: "https://...",
  description: "...",
  skills: ["JavaScript", "Node.js", "SQL"],
  matchScore: 87,
  bookmarked: false
}
```

### Skill

```js
{
  id: "uuid",
  name: "JavaScript",
  category: "Frontend",
  level: "intermediaire",
  score: 78,
  verified: false
}
```

### User

```js
{
  id: "uuid",
  firstName: "Nom",
  lastName: "Prenom",
  email: "user@example.com",
  role: "user",
  location: "Paris",
  createdAt: "2026-06-04T00:00:00.000Z"
}
```

### MatchingResult

```js
{
  id: "uuid",
  opportunityId: "uuid",
  score: 87,
  matchedSkills: ["Node.js", "SQL"],
  missingSkills: ["Docker"],
  explanation: "Bon alignement avec le profil."
}
```

---

## 11. Problemes A Corriger

| Probleme | Impact | Correction |
|---|---|---|
| CSS duplique dans plusieurs pages | Maintenance difficile | Centraliser dans `design-system.css` et `components.css` |
| `assets/` et `view/assets/` dupliques | Risque de divergence | Choisir une seule source d'assets |
| Pages HTML tres longues | Difficile a maintenir | Extraire widgets JS/CSS |
| Routes API parfois en double | Confusion frontend/backend | Documenter la route canonique |
| Encodage incorrect dans certains docs | Lecture difficile | Re-sauvegarder en UTF-8 |
| Melange francais/anglais dans noms | Incoherence | Standardiser progressivement |
| Etat UI gere localement page par page | Bugs de synchronisation | Creer un petit store global |

---

## 12. Parcours Utilisateur Cibles

### Parcours candidat

1. L'utilisateur s'inscrit.
2. Il complete son profil.
3. Il upload son CV.
4. Il lance l'analyse IA.
5. Les competences sont extraites.
6. Il consulte les opportunites.
7. Il lance un matching.
8. Il consulte les offres avec score.
9. Il sauvegarde ou postule.

Widgets necessaires :

- `AuthLayout`
- `RegisterForm`
- `ProfileSettingsForm`
- `CVUploadBox`
- `CVAnalysisPanel`
- `OpportunityList`
- `OpportunityCard`
- `MatchingRunPanel`
- `MatchingResultCard`

### Parcours admin

1. L'admin se connecte.
2. Il consulte les statistiques.
3. Il gere les utilisateurs.
4. Il gere les offres et entreprises.
5. Il suit les abonnements.
6. Il traite les tickets support.
7. Il configure les parametres systeme.

Widgets necessaires :

- `AppShell`
- `AdminDashboardSummary`
- `DataTable`
- `TableToolbar`
- `FormModal`
- `ConfirmDialog`
- `StatusBadge`
- `RolePermissionMatrix`
- `SupportTicketDetail`

---

## 13. Recommandation Finale

La reconstruction ideale consiste a garder l'API Express/MySQL actuelle et a refaire progressivement le frontend en widgets reutilisables.

Priorite absolue :

1. Unifier le design system.
2. Creer les composants layout.
3. Creer les composants generiques.
4. Migrer les pages candidat.
5. Migrer les pages admin.
6. Ajouter des tests e2e sur login, upload CV, matching et gestion admin.

Cette approche evite de tout reecrire d'un coup et transforme progressivement le projet en application maintenable.

