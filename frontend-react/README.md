# TheWay Frontend React

Nouveau frontend React/Vite pour TheWay Platform. Il ne modifie pas le backend `API/`, la base MySQL, ni `scraping.py`.

## Stack

- React + Vite
- React Router
- Axios avec `withCredentials`
- CSS Modules + design tokens globaux
- Lucide React pour les icones

## Demarrage

Depuis ce dossier :

```bash
npm install
npm run dev
```

Le frontend demarre par defaut sur `http://localhost:5173`.

Depuis la racine du projet, tu peux aussi lancer les deux serveurs avec :

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

Le backend doit tourner sur `http://localhost:3001` :

```bash
cd ../API
npm install
npm run dev
```

## Configuration API

Par defaut, `VITE_API_BASE_URL` reste vide et Vite proxy les routes `/api`, `/auth`, `/file-export`, `/opportunity-bookmark`, etc. vers `http://localhost:3001`.

Pour utiliser une API externe, copie `.env.example` vers `.env` et renseigne :

```bash
VITE_API_BASE_URL=http://localhost:3001
```

Dans ce cas, le backend doit autoriser l'origine Vite dans sa configuration CORS.

## Contrats utilises

Routes principales branchees :

- `GET /api/auth/session`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/opportunities`
- `GET /api/opportunities/:id`
- `POST /api/opportunities/:id/bookmark`
- `DELETE /api/opportunities/:id/bookmark`
- `POST /api/opportunities/:id/applications`
- `POST /api/cv`
- `GET /api/cv/current`
- `POST /api/cv/:id/analyse`
- `POST /api/matching/run`
- `GET /api/matching`
- `GET /api/profile`
- `PUT /api/profile`
- `GET/POST/PUT/DELETE /api/skills`
- `GET /api/panel/summary`
- `GET /api/panel/skills`
- `GET /api/panel/users`
- `GET /api/admin/roles`

Les endpoints admin `POST/PUT/DELETE users/offers` ne sont pas exposes dans `API/routes/production.js`; les wrappers existent dans `src/api/adminApi.js` et signalent explicitement que le backend ne fournit pas encore ces operations.

## Architecture

```text
src/
  api/            appels API centralises
  components/     layout, UI generique et composants metier
  context/        AuthContext
  hooks/          hooks reutilisables
  pages/          pages auth, candidat et admin
  router/         routes et guards
  styles/         design tokens et global CSS
```

## Notes de validation

Si `npm install` reste bloque sous PowerShell, utilise `npm.cmd install`. Si le reseau local bloque le registre npm, relance l'installation avec un acces reseau autorise.
