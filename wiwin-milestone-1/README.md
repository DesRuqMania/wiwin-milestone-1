# WHO IS WHO IN NASARAWA? (WIWIN)

Milestone 1 starter application: dark editorial React website, Express API, PostgreSQL/Prisma, public applications and nominations, administrator login and application review.

## Requirements
- Node.js 20 or newer
- PostgreSQL 14 or newer
- npm

## 1. Install

From the project root:

```bash
npm install
npm --prefix client install
cp .env.example .env
```

Edit `.env`. Set a strong, unique `SESSION_SECRET`, a working PostgreSQL `DATABASE_URL`, and an administrator name, email and password. Use a password of at least 12 characters.

## 2. Create the database

Create an empty PostgreSQL database named `wiwin`, then run:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed:admin
```

The seed command creates or updates the administrator specified in `.env` and seeds the initial interview categories. Do not use the example credentials in production.

## 3. Run locally

```bash
npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:3000/api/v1/health  
Administrator: http://localhost:5173/admin/login

The Vite development server proxies `/api` requests to Express.

## 4. Production build

```bash
npm run build
npm start
```

In production, Express serves the compiled React application from `client/dist`.

## 5. Render deployment

1. Push this repository to GitHub.
2. Create a managed PostgreSQL database in Render.
3. Create a Render Web Service connected to the repository.
4. Set the build command to `npm install && npm --prefix client install && npm run prisma:generate && npm run build`.
5. Set the start command to `npm run prisma:migrate && npm start`.
6. Add environment variables in Render: `NODE_ENV=production`, `DATABASE_URL` (the Render database internal URL), `SESSION_SECRET` (strong random value), `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
7. Deploy. Once deployed, run `npm run seed:admin` once through an available deployment shell/job, or use a one-off Render job with the same environment variables. Do not expose a public admin-registration endpoint.
8. Configure a custom domain later, after the name is final.

For Render, use the database's internal connection URL when the web service and database are in the same Render region. Configure SSL according to the current Render PostgreSQL connection instructions. The current server config enables TLS for production connections.

## Important security notes
- Never commit `.env` or production secrets.
- Replace the development session secret before deployment.
- Restrict administrator account creation to trusted operators. There is no public sign-up route.
- Application tracking currently uses a reference number. Before public launch, add a second verification factor (for example, email OTP) so possession of a reference alone does not expose status information.
- Do not treat the optional media-interest checkbox as recording or publication consent. Separate, specific consent must be obtained before recording, broadcasting or publishing.
- For minors, implement guardian verification, child assent, age-appropriate review and additional safeguarding before accepting or publishing interviews.
- Add email delivery, password reset, CSRF protection, monitoring, backups, retention workflows and formal privacy notices before production launch.
- The first milestone does not yet include AI discovery, AI interviewing, YouTube/OBS control, file uploads or full nomination administration.

## API summary
Base path: `/api/v1`

Public:
- `GET /health`
- `GET /categories`
- `POST /applications`
- `GET /applications/track/:reference`
- `POST /nominations`

Admin:
- `POST /admin/auth/login`
- `POST /admin/auth/logout`
- `GET /admin/auth/me`
- `GET /admin/dashboard`
- `GET /admin/applications`
- `GET /admin/applications/:id`
- `PATCH /admin/applications/:id/status`
- `GET /admin/nominations`

All admin routes except login/logout/current-session check require an active administrator session.
