# Deployment checklist

- [ ] Provision PostgreSQL and restrict network access.
- [ ] Run `server/sql/001_care_compass_schema.sql` against an empty database.
- [ ] Import all operational sheets with `cd server && npm install && npm run db:import`.
- [ ] Run `npm run validate:scenarios` in `server/`; require all SCN1–SCN5 checks to pass.
- [ ] Start the API and verify `/api/health`, `/api/summary` and `/api/scenarios`.
- [ ] Run `POST /api/scenarios/SCN1/execute` through SCN5 and inspect returned step checks.
- [ ] Deploy API and configure `DATABASE_URL`, `PGSSLMODE`, `CORS_ORIGIN`.
- [ ] Deploy frontend with `VITE_API_URL` set to the deployed API URL.
- [ ] Verify all six workspaces load live PostgreSQL data and persistent actions survive a refresh.
- [ ] Complete production authentication/RBAC, audit security, browser end-to-end tests, accessibility checks and clinical/security review before production use.
