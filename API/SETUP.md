# TheWay API Setup Guide

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server (v5.7 or higher)
- npm (comes with Node.js)

### Step 1: Install Dependencies

```bash
cd API
npm install
```

### Step 2: Database Setup

#### Option A: Using MySQL Command Line
1. Create the database by running the SQL script:
```bash
mysql -u root -p < ../database/database.sql
```

#### Option B: Using MySQL Client/Workbench
1. Open your MySQL client
2. Create a new connection (or use existing)
3. Open and run the SQL script from `../database/database.sql`

### Step 3: Configure Environment Variables

Create or update `API/.env` before starting the server:

```bash
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=theway

# Required security values
JWT_SECRET=replace_with_a_long_random_secret
CORS_ORIGIN=http://localhost:8000,http://127.0.0.1:8000,http://localhost:3000

# Server Port
PORT=3001
```

`JWT_SECRET` is mandatory. In local development, if MySQL is not running, the API falls back to the encrypted file `API/data/fallback-store.enc` for auth, profile and skills. Button action history is written to a bounded encrypted append-only log at `API/data/fallback-actions.log.enc`.

### Step 4: Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server will run on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user
- `POST /auth-password-recovery` - Password recovery
- `POST /auth-social` - Social login

Social login requires server-side OAuth token verification before it can create a session. Until a provider verification flow is configured, the endpoint returns a clear setup error instead of trusting an email sent by the browser.

### Drafts
- `POST /draft-create` - Create a draft

### Entities
- `POST /entity-update` - Update entity
- `POST /entity-delete` - Delete entity

### Files
- `POST /file-upload` - Upload file
- `POST /file-export` - Export data

### Opportunities
- `POST /opportunity-bookmark` - Bookmark/unbookmark opportunity
- `GET /api/opportunities` - Get all opportunities

### Integrations
- `POST /integration-connect` - Connect integration
- `POST /integration-disconnect` - Disconnect integration
- `POST /integration-update` - Update integration

### Process
- `POST /process-run` - Run process

### Skills
- `GET /api/skills` - Get all skills
- `POST /api/skills` - Create skill

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

### Health
- `GET /health` - Check server status

## Frontend Configuration

Add this line to your HTML files (or in the main layout):

```html
<script>
    window.THEWAY_API_BASE = 'http://localhost:3001';
</script>
```

This enables the frontend to communicate with the backend API.

## Troubleshooting

### "ECONNREFUSED" Error
- Ensure MySQL is running
- Check the database connection parameters in `.env`
- For local-only testing, the API can continue with its JSON fallback store when MySQL is unavailable

### "Port 3001 already in use"
- Change the PORT in `.env` to another value (e.g., 3002)
- Or kill the process using the port

### Database Connection Errors
- Verify MySQL credentials in `.env`
- Ensure the database exists and is accessible
- Run the database.sql script to create tables

### JWT Token Errors
- Ensure `JWT_SECRET` is set before `npm start`
- Clear browser cache/session storage
- Log in again to get a new token

## Production Deployment

Before deploying to production:

1. Change `JWT_SECRET` to a strong random string
2. Set `NODE_ENV=production`
3. Use a production database (not localhost)
4. Update `CORS_ORIGIN` to your frontend URL
5. Use HTTPS instead of HTTP
6. Set up proper error logging
7. Configure email service for password recovery

## Database Schema

The database includes the following tables:
- `utilisateur` - Users
- `parametres` - User settings
- `notification` - Notifications
- `user_notification` - User-notification relationship
- `competence` - Skills
- `user_skill` - User-skill relationship
- And more for opportunities, companies, etc.

See `../database/database.sql` for the complete schema.

## Support

For issues or questions, please refer to the main README.md in the project root.
