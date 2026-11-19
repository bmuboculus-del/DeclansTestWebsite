# Craic Mountain Roleplay — website + admin CMS

A complete, original Irish-green, white and orange roleplay website using your supplied mountain logo. Includes a password-protected editing dashboard. No third-party packages required.

## What the editor can change

Visit `/admin.html` and log in to change the site name, homepage introduction, headings, announcement, Discord invite, rules, departments and events. Choose **Publish changes** to update the live site immediately. Public visitors see the changes when refreshing their pages. The logo is included in `public/assets/logo.png`.

**Important:** This is not yet deployed. Real hosting requires your Railway (or another hosting service) account. The admin login uses a server-side password, not a hardcoded website password. This starter project has one admin user/password, not separate staff accounts, audit logs, or a database for applications. The demo application form on the public site still only saves to the visitor's browser; do not use it as a real staff application workflow.

## Run locally

1. Install Node.js 20 or newer.
2. Open a terminal in this folder.
3. Set `ADMIN_PASSWORD` to a strong secret and `SESSION_SECRET` to a long random secret. Never put these in HTML or upload them to GitHub.
4. Run `npm start`.
5. Open `http://localhost:3000` for the website and `http://localhost:3000/admin.html` for the admin panel.

Example for macOS/Linux:

```bash
ADMIN_PASSWORD='make-this-a-unique-long-password' SESSION_SECRET='replace-this-with-a-long-random-32-character-plus-value' npm start
```

On Windows PowerShell:

```powershell
$env:ADMIN_PASSWORD='make-this-a-unique-long-password'
$env:SESSION_SECRET='replace-this-with-a-long-random-32-character-plus-value'
npm start
```

## Deploy to Railway

1. Extract the ZIP. Upload the **contents** of `craic-mountain-cms` as the root of a private GitHub repository (or use Railway's CLI to deploy this directory).
2. In [Railway](https://railway.com/), choose **New Project → Deploy from GitHub repo** and select that repository.
3. In the service **Variables** section, add `NODE_ENV=production`, a unique `ADMIN_PASSWORD` (at least 12 characters), and a randomly generated `SESSION_SECRET` (at least 32 characters). Keep these private.
4. Create a **persistent volume** for the service mounted to `/data`. Add `DATA_FILE=/data/content.json` to the service variables. Without the volume, edits could be lost when the app redeploys or restarts. The app copies the initial data on the first startup when the volume is empty.
5. Deploy the service. In **Settings → Networking**, generate a public domain. The public site is at your generated domain; the admin panel is at `https://your-domain/admin.html`.
6. Optional: connect your own custom domain and follow Railway's displayed DNS instructions.

The project includes a Dockerfile compatible with Railway's builds. It listens on Railway's `PORT` environment variable.

### Security and operations

- Use HTTPS, a unique administrator password and a long random session secret. The site is designed for a single trusted admin.
- Back up the persistent volume regularly; content is stored in one JSON file, not in an external managed database.
- Keep one running instance when using this JSON-file storage approach. For multi-instance scaling, migrations, robust editorial workflows and high traffic, use a managed database instead.
- Public rules/events/department content is rendered as plain text, reducing script-injection risks.
- Admin sessions last 12 hours; login attempts have a basic per-IP throttle.
- Discord "Join" links become active when you save a valid invite URL in the admin panel. Discord OAuth login is **not** implemented.

## Project structure

```
server.js              Node.js backend and secure admin API
public/index.html      Public website
public/cms.js          Fetches and displays published content
public/admin.html      Editing dashboard
public/admin.js        Admin editing controls
public/admin.css       Admin dashboard styles
public/assets/logo.png Your supplied image
 data/content.json     Initial published content
```
