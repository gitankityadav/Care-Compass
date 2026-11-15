# Care Compass — complete development handoff

This folder contains the React/Vite application, the supplied synthetic workbook, the approved PostgreSQL schema migration, a workbook-to-PostgreSQL importer, and the source reference documents.

## Source-of-truth assets included
- `server/data/Care_Compass_Synthetic_Data.xlsx` — full 32-sheet synthetic workbook.
- `docs/reference/Care_Compass_Data_Schema_v1.0.pdf` — approved ERD and data dictionary (27 operational tables / 275 columns).
- `docs/reference/Care_Compass_User_Stories.xlsx` — user stories.
- `docs/reference/Care_Compass_Enterprise_Ontology.docx` — enterprise ontology.
- `server/sql/001_care_compass_schema.sql` — PostgreSQL DDL and FK constraints.
- `server/sql/schema-manifest.json` — table, column, primary-key and row-count manifest.

## Requirements
- Node.js 20+
- PostgreSQL 15+
- Windows PowerShell, macOS Terminal or Linux shell

## 1. Run the UI locally
From this folder:
```bash
npm install
npm run dev
```
Open `http://localhost:5173`.

The React application now attempts to load all 27 operational tables from the PostgreSQL API at startup (`VITE_API_URL`, default `http://localhost:4000`). When the API is reachable, the dashboard, patient, logistics, device, nurse and alert registers are hydrated from PostgreSQL. The patient reassignment, shipment status, device status, nurse availability and resilience alert status controls call the API. Alert creation also inserts into PostgreSQL. API updates write an audit event. The frontend loads the operational tables in parallel at startup. If the API is unavailable, the UI falls back to the bundled local preview and clearly reports local mode.

## 2. Create the database
Create an empty PostgreSQL database (for example `care_compass`), then:
```bash
cd server
copy .env.example .env
```
Edit `server/.env` and set `DATABASE_URL` to your database connection string. For local PostgreSQL, a typical URL is:
`postgresql://postgres:YOUR_PASSWORD@localhost:5432/care_compass`

Run the schema:
```bash
psql "%DATABASE_URL%" -f sql/001_care_compass_schema.sql
```
If your shell does not expand `%DATABASE_URL%`, paste the connection URL directly:
```bash
psql "postgresql://postgres:YOUR_PASSWORD@localhost:5432/care_compass" -f sql/001_care_compass_schema.sql
```
For hosted PostgreSQL, use the provider's connection string and required SSL settings.

## 3. Import all synthetic workbook records
From `server/`:
```bash
npm install
npm run db:import
```
This imports the 27 operational sheets. The five guidance/metadata sheets (`START_HERE`, `relationship_map`, `QA_validation`, `data_dictionary`, `Golden_scenarios`) are reference material and are not operational tables.
To empty the operational tables before reimporting:
```bash
node scripts/import-workbook.js data/Care_Compass_Synthetic_Data.xlsx --replace
```
Only run `--replace` against a development/test database: it truncates the operational tables.

## 4. Start the API
From `server/`:
```bash
npm run dev
```
Health check: `http://localhost:4000/api/health`
Golden scenarios: `GET http://localhost:4000/api/scenarios`
Run and verify a scenario: `POST http://localhost:4000/api/scenarios/SCN1/execute` (replace SCN1 with SCN2–SCN5).
Validate all five scenarios after import: `npm run validate:scenarios`
Table names: `http://localhost:4000/api/tables`
Row counts: `http://localhost:4000/api/summary`
Read rows: `http://localhost:4000/api/data/patients?limit=100`

## 5. Deployment outline
- Frontend: deploy the root Vite project to Vercel; build command `npm run build`, output directory `dist`; set `VITE_API_URL` to the deployed API URL.
- API: deploy `server/` as a Node web service (for example Render); start command `npm start`; set `DATABASE_URL`, `PGSSLMODE`, and `CORS_ORIGIN`.
- Database: provision managed PostgreSQL, execute the SQL migration once, then run the importer from a secure environment.
- Do not commit `.env` files or production credentials.

## Important fidelity and safety notes
- IDs remain strings; do not cast them to numbers or regenerate them.
- `scenario_id` is descriptive metadata, not an FK to a database scenario table.
- `audit_log.entity_id` is polymorphic and intentionally has no ordinary FK.
- `inventory.available_qty` must equal `on_hand_qty - reserved_qty`.
- Hospital-wide shipments may have no patient allocation; patient linkage is through `shipment_patient_allocation`.
- Lifecycle history remains in `shipment_events` and `ticket_status_history`; do not overwrite it with only a current status.
- Synthetic coordinates are approximate and are not navigation-grade.
- This dataset is fictional. Never upload real patient data to a public demo.

## Golden scenario engine
- `GET /api/scenarios` lists SCN1–SCN5.
- `GET /api/scenarios/:id` returns the linked source records for the requested scenario.
- `POST /api/scenarios/:id/execute` runs an idempotent PostgreSQL transaction, applies missing target-state updates, checks the linked records and returns step-level results.
- The Executive Twin includes a Golden Scenario Runner for all five scenarios.
- Run `npm run validate:scenarios` from `server/` after import to validate all five traces directly against the database.

The source workbook already contains completed synthetic scenario traces. The scenario engine verifies and restores expected final state when a linked target field is incomplete; it does not invent new source entities or change the scenario definitions. It also reports source-data mismatches instead of silently rewriting them (the SCN1 supply item labels and SCN4 recall/device manufacturer-model labels currently differ in the supplied workbook).

## What is and is not complete in this handoff
Included: existing six-module React UI, PostgreSQL data hydration, allowlisted persistent UI actions, audit writes, five scenario transaction endpoints, scenario step checks, full 32-sheet synthetic workbook, schema DDL for 27 operational tables, workbook importer, validation script and source reference documents.

Still required before production: production authentication and server-enforced RBAC, live GIS routing, real EHR/device integrations, automated browser end-to-end tests, and execution/validation against your own hosted PostgreSQL environment. The rule-based Copilot is not an LLM service. This is a development handoff, not a certified clinical or production system.
