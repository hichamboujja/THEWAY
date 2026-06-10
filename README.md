# TheWay

TheWay is a CareerTech SaaS for candidates who want to understand their profile, improve their CV, track skills, match with relevant job opportunities, and manage applications from one dashboard.

The product includes a React candidate experience, an admin console, an Express API, MySQL persistence, CV/file storage, AI-assisted CV analysis and matching, notifications, audit logs, import job tracking, support, and billing foundations.

## Contents

- [Product Scope](#product-scope)
- [Architecture](#architecture)
- [Repository Layout](#repository-layout)
- [Tech Stack](#tech-stack)
- [Local Setup](#local-setup)
- [Environment](#environment)
- [Database](#database)
- [Common Commands](#common-commands)
- [Frontend Routes](#frontend-routes)
- [API Overview](#api-overview)
- [AI Features](#ai-features)
- [Admin Operations](#admin-operations)
- [Files and Storage](#files-and-storage)
- [Scraping and Imports](#scraping-and-imports)
- [Security](#security)
- [Quality Checks](#quality-checks)
- [Deployment Notes](#deployment-notes)
- [Current Gaps](#current-gaps)

## Product Scope

TheWay helps candidates answer four practical questions:

- Is my profile complete enough to apply?
- Which skills should I improve next?
- Which opportunities fit my CV and skills best?
- What should I do next to move applications forward?

Candidate features:

- Account registration, login, session restore, and logout.
- Candidate dashboard with profile completeness, next actions, career score, recommended opportunities, saved offers, market insights, notifications, application pipeline, skill gaps, and AI coach tips.
- CV upload, current CV display, text extraction, AI CV analysis, and extracted skill synchronization.
- Skill tracking with user skill levels and scores.
- Opportunity search, detail pages, bookmarking, and applications.
- Matching runs that rank opportunities against the candidate profile.
- Real notification center backed by `notification` and `user_notification`.
- User settings for profile details and account preferences.

Admin features:

- Admin dashboard with platform totals, recent opportunities, import job status, audit activity, offer quality, and user growth.
- User, offer, enterprise, skill, support, notification, subscription, role, invoice, and settings administration.
- Audit log feed from important backend actions.
- Import job visibility from `import_job`.

## Architecture

TheWay is a monorepo with a Vite frontend and an Express API.

```text
React frontend
  -> Axios API client
  -> Express API
  -> MySQL
  -> local storage or S3-compatible storage
  -> optional AI provider
```

The root package only orchestrates scripts. Backend and frontend dependencies live in their own packages.

## Repository Layout

```text
.
  API/                    Express API, services, middleware, scripts, tests
  frontend-react/         React 18 + Vite application
  database/               SQL schema and migrations
  assets/                 Legacy/static assets and imported data locations
  storage/                Local uploaded files in development
  scraping.py             Opportunity scraping/import helper
  start-dev.ps1           Windows helper to start API and frontend
  package.json            Root convenience scripts
  .env.example            Minimal root environment example
```

Backend highlights:

```text
API/
  app.js                  Express app composition and route mounting
  server.js               API server entrypoint
  lib/                    Config, DB, responses, passwords, logging, migrations
  middleware/             Auth, CSRF, admin checks, rate limiting
  routes/production.js    Main production API routes
  routes/admin/           Admin CRUD/dashboard routes
  services/               AI, audit, CV text, email, storage
  scripts/                migrate, seed, static checks
  tests/                  Jest and Playwright tests
```

Frontend highlights:

```text
frontend-react/src/
  api/                    Axios wrappers for backend resources
  components/             UI, layout, auth, dashboard, admin, CV, matching
  context/                Auth/session context
  hooks/                  Reusable app hooks
  pages/                  Public, candidate, and admin pages
  router/                 React Router route table
  styles/                 Global styles and design tokens
```

## Tech Stack

Frontend:

- React 18
- Vite
- React Router
- Axios
- Lucide React
- CSS Modules

Backend:

- Node.js 20+
- Express
- MySQL2
- Express Session
- Argon2 password hashing
- Helmet, CORS, CSRF, rate limiting
- Multer uploads
- Zod and express-validator validation
- Pino logging
- OpenTelemetry hooks
- Nodemailer
- `pdf-parse` and `mammoth` for CV text extraction

Database:

- MySQL 8 or compatible
- SQL migrations under `database/migrations`

## Local Setup

Prerequisites:

- Node.js 20 or newer
- npm
- MySQL 8 or compatible
- PowerShell if using `start-dev.ps1` on Windows

Install dependencies:

```bash
npm install
npm --prefix API install
npm --prefix frontend-react install
```

Create a local environment file:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Create the database:

```sql
CREATE DATABASE theway CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Run migrations and seed data:

```bash
npm run migrate
npm run seed
```

Start the app:

```bash
npm run dev:api
npm run dev:frontend
```

Or on Windows:

```powershell
.\start-dev.ps1
```

Default local URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001`
- API health: `http://localhost:3001/health`

## Environment

The root `.env` is loaded first by the API. An `API/.env` file can override it.

Minimal local variables:

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

Important production variables:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime environment. Use `production` in production. |
| `PORT` | API port. |
| `APP_BASE_URL` | Public API base URL. |
| `CLIENT_BASE_URL` | Public frontend base URL. |
| `CORS_ORIGIN` | Allowed frontend origin(s). |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection. |
| `COOKIE_SECRET` | Session cookie secret. Required for real deployments. |
| `CSRF_SECRET` | CSRF signing secret. Required for real deployments. |
| `STORAGE_DRIVER` | `local` or S3-compatible storage. |
| `LOCAL_UPLOAD_DIR` | Local upload directory when using local storage. |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | Optional AI provider configuration. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | SMTP email delivery. |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | Optional initial admin account. |

In local/mock/test AI mode, AI service functions use deterministic local fallbacks instead of calling an external model.

## Database

Database files live in `database/`.

Core migrations:

- `001_admin_tables.sql`: admin-era base tables.
- `002_production_core.sql`: production additions for roles, sessions, files, saved opportunities, applications, CV analysis, matching, support, billing, settings, audit logs, and import jobs.

Important tables:

- Identity and auth: `utilisateur`, `roles`, `permissions`, `user_roles`, `auth_sessions`, `auth_accounts`
- Candidate data: `cv`, `cv_analysis`, `competence`, `user_skill`, `progression`, `objectif`
- Opportunities: `opportunities`, `offre`, `saved_opportunity`, `application`
- Matching: `matching_run`, `matching_result`
- Notifications: `notification`, `user_notification`
- Admin and operations: `audit_log`, `import_job`, `app_setting`, `rate_limit_bucket`
- Billing/support: `plan_catalogue`, `billing_subscription`, `billing_invoice`, `support_ticket`
- Files: `file_asset`

Run migrations with:

```bash
npm run migrate
```

Seed data with:

```bash
npm run seed
```

## Common Commands

Root scripts:

```bash
npm run dev:api
npm run dev:frontend
npm run build:frontend
npm run start:api
npm run migrate
npm run seed
```

Backend scripts:

```bash
npm --prefix API run dev
npm --prefix API start
npm --prefix API run migrate
npm --prefix API run seed
npm --prefix API run build
npm --prefix API run lint
npm --prefix API run typecheck
npm --prefix API test
npm --prefix API run test:e2e
```

Frontend scripts:

```bash
npm --prefix frontend-react run dev
npm --prefix frontend-react run build
npm --prefix frontend-react run preview
```

## Frontend Routes

Public:

- `/` - landing/index page
- `/login` - login
- `/register` - account creation

Candidate:

- `/dashboard` - candidate dashboard
- `/opportunities` - opportunity search
- `/opportunities/:id` - opportunity detail
- `/skills` - skill management
- `/cv` - CV upload and analysis
- `/matching` - matching runs and results
- `/settings` - profile and account settings

Admin:

- `/admin` - admin dashboard
- `/admin/users` - users
- `/admin/offers` - offers
- `/admin/skills` - skills
- `/admin/support` - support tickets
- `/admin/billing` - plans, invoices, subscriptions
- `/admin/settings` - roles and admin settings

## API Overview

Most API responses use this shape:

```json
{
  "ok": true,
  "data": {}
}
```

Frontend API clients normalize this through `frontend-react/src/api/client.js`.

Authentication:

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/auth/session` | Current user, auth state, CSRF token |
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Start session |
| `POST` | `/api/auth/logout` | End session |
| `POST` | `/api/auth/password-reset/request` | Request password reset |
| `POST` | `/api/auth/password-reset/confirm` | Complete password reset |
| `GET` | `/api/auth/oauth/:provider/start` | Start OAuth login |
| `GET` | `/api/auth/oauth/:provider/callback` | OAuth callback |

Candidate profile:

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/profile` | Current profile |
| `PUT` | `/api/profile` | Update profile |
| `PUT` | `/api/account/password` | Change password |
| `PUT` | `/api/account/email` | Change email |
| `GET` | `/api/settings/user` | User settings |
| `PUT` | `/api/settings/user` | Update user settings |

Opportunities and applications:

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/opportunities` | Search/list opportunities |
| `GET` | `/api/opportunities/:id` | Opportunity detail |
| `POST` | `/api/opportunities/:id/bookmark` | Save opportunity |
| `DELETE` | `/api/opportunities/:id/bookmark` | Remove saved opportunity |
| `POST` | `/api/opportunities/:id/applications` | Apply to opportunity |

Skills and objectives:

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/skills` | User skills |
| `POST` | `/api/skills` | Add skill |
| `PUT` | `/api/skills/:id` | Update skill |
| `DELETE` | `/api/skills/:id` | Delete skill |
| `GET` | `/api/objectives` | User objectives |
| `POST` | `/api/objectives` | Create objective |
| `PUT` | `/api/objectives/:id` | Update objective |
| `DELETE` | `/api/objectives/:id` | Delete objective |

CV, files, matching, and AI:

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/cv` | Upload CV |
| `GET` | `/api/cv/current` | Latest CV |
| `POST` | `/api/cv/:id/analyse` | Analyze CV with AI service |
| `POST` | `/api/files/presign` | Create file asset/upload intent |
| `POST` | `/api/files/:id/content` | Upload file content |
| `POST` | `/api/files/complete` | Complete file upload |
| `GET` | `/api/files/:id` | Read/download file |
| `DELETE` | `/api/files/:id/delete` | Delete file |
| `POST` | `/api/matching/run` | Run opportunity matching |
| `GET` | `/api/matching` | Latest matching results |
| `GET` | `/api/matching/:id` | Matching result detail |
| `POST` | `/api/ai/coach` | AI career coach tips |

Notifications, support, billing:

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/notifications` | User notifications |
| `PUT` | `/api/notifications/:id` | Mark notification read/unread |
| `GET` | `/api/support/tickets` | User support tickets |
| `POST` | `/api/support/tickets` | Create support ticket |
| `POST` | `/api/billing/upgrade-request` | Request plan upgrade |
| `GET` | `/api/plans` | Public plans |

Admin:

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/admin/dashboard` | Admin totals, recent opportunities, import jobs, audit activity |
| `GET` | `/api/admin/users` | List users |
| `POST` | `/api/admin/users` | Create user |
| `PUT` | `/api/admin/users/:id` | Update user |
| `DELETE` | `/api/admin/users/:id` | Delete user |
| `GET` | `/api/admin/offers` | List offers |
| `POST` | `/api/admin/offers` | Create offer |
| `PUT` | `/api/admin/offers/:id` | Update offer |
| `DELETE` | `/api/admin/offers/:id` | Delete offer |
| `GET` | `/api/admin/skills` | List admin skills |
| `POST` | `/api/admin/skills` | Create skill |
| `PUT` | `/api/admin/skills/:id` | Update skill |
| `DELETE` | `/api/admin/skills/:id` | Delete skill |
| `GET` | `/api/admin/support` | List support tickets |
| `POST` | `/api/admin/support` | Create support ticket |
| `PUT` | `/api/admin/support/:id` | Update support ticket |
| `DELETE` | `/api/admin/support/:id` | Delete support ticket |
| `GET` | `/api/admin/roles` | Roles and permissions |
| `PUT` | `/api/admin/roles/:role/permissions` | Update role permissions |
| `GET` | `/api/admin/invoices` | List invoices |
| `GET` | `/api/admin/invoices/:id/download` | Download invoice text |
| `GET` | `/api/admin/notifications` | List notifications |
| `POST` | `/api/admin/notifications` | Create notification |
| `PUT` | `/api/admin/notifications/:id` | Update notification |
| `DELETE` | `/api/admin/notifications/:id` | Delete notification |
| `GET` | `/api/admin/subscriptions` | List subscriptions |
| `POST` | `/api/admin/subscriptions` | Create subscription |
| `PUT` | `/api/admin/subscriptions/:id` | Update subscription |
| `DELETE` | `/api/admin/subscriptions/:id` | Delete subscription |
| `GET` | `/api/admin/enterprises` | List enterprises |
| `GET` | `/api/admin/analytics` | Admin analytics |
| `GET` | `/api/docs/openapi.json` | Minimal OpenAPI document |

## AI Features

The AI service is implemented in `API/services/aiService.js`.

Current functions:

- `analyseCvText(text)`: extracts summary and skills from CV text.
- `rankOpportunities(profile)`: ranks opportunities for the candidate.
- `coachSuggestions(profile)`: returns concise career tips for the dashboard coach.

When configured with a real provider, the service sends JSON-mode chat completion requests to the configured provider. In local/mock/test mode it returns deterministic fallback results so the app remains usable without an external API key.

## Admin Operations

The admin dashboard reads real operational tables:

- `audit_log` powers the recent activity timeline.
- `import_job` powers scraper/import status.
- `opportunities` and `offre` power recent offer lists and quality checks.
- `notification` powers latest platform notifications.

Important actions in production routes call `audit()` from `API/services/auditService.js`.

## Files and Storage

The storage service supports local storage and S3-compatible storage.

Common file flows:

- CV upload through `/api/cv`.
- Generic file upload through `/api/files/*`.
- CV text extraction through `pdf-parse` and `mammoth`.

Local uploads are stored under `storage/` by default. Do not commit uploaded user files.

## Scraping and Imports

`scraping.py` is the project-level helper for collecting or preparing external opportunities.

Imported jobs should write operational status to `import_job`:

- `source`
- `status`
- `imported_count`
- `error_message`
- `completed_at`

The admin dashboard reads the latest rows to show real scraper/import status.

## Security

Security controls in the API include:

- HTTP-only session cookies.
- MySQL-backed sessions.
- Argon2 password hashing.
- CSRF protection for state-changing requests.
- CORS configuration.
- Helmet security headers.
- Role and admin middleware.
- Rate limiting by action bucket.
- Audit logging for important actions.
- Upload controls and storage abstraction.

Production checklist:

- Use HTTPS.
- Set strong `COOKIE_SECRET` and `CSRF_SECRET`.
- Restrict `CORS_ORIGIN` to the deployed frontend.
- Use a least-privilege MySQL user.
- Back up MySQL and uploaded files.
- Do not commit `.env` or user uploads.
- Configure email and AI providers with real secrets outside git.

## Quality Checks

Backend:

```bash
npm --prefix API run build
npm --prefix API run lint
npm --prefix API run typecheck
npm --prefix API test
```

Frontend:

```bash
npm run build:frontend
```

End-to-end tests:

```bash
npm --prefix API run test:e2e
```

## Deployment Notes

Backend deployment:

```bash
npm --prefix API ci --omit=dev
npm --prefix API run migrate
npm --prefix API run seed
npm --prefix API start
```

Frontend deployment:

```bash
npm --prefix frontend-react ci
npm --prefix frontend-react run build
```

Serve `frontend-react/dist` from a static host or reverse proxy. Run the API behind a process manager or platform service. Make sure `APP_BASE_URL`, `CLIENT_BASE_URL`, cookies, CORS, and HTTPS all agree.

## Current Gaps

Known areas to improve:

- Expand the generated OpenAPI document beyond the current minimal route list.
- Add frontend automated tests.
- Add Docker Compose for local MySQL/API/frontend orchestration.
- Add scheduled import jobs around `scraping.py`.
- Add a complete conversational coach experience beyond dashboard tips.
- Add real payment provider integration if subscriptions move beyond admin-managed records.
