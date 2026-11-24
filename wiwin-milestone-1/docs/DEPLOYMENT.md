# Deployment notes

## Render resources
- One Render Web Service (Node).
- One Render PostgreSQL database.
- External object storage will be added in the media milestone.

## Web Service
Build command:

```bash
npm install && npm --prefix client install && npm run prisma:generate && npm run build
```

Start command:

```bash
npm run prisma:migrate && npm start
```

Set `NODE_ENV=production`, `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in Render environment settings. Set `PORT` only if required by the platform; Express reads Render's injected `PORT`.

## Database
Use Render's internal database URL for a service in the same region. Keep backups enabled. Run schema changes only through reviewed Prisma migrations. Seed the first administrator once using a one-off job or shell with the production environment.

## Health check
Configure the Render health check path as `/api/v1/health`.
