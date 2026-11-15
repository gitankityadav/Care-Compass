# Care Compass update notes

## Changes made
- Expanded `src/data/workbook-sample.json` to include all 32 source workbook sheets.
- Included up to 100 rows per sheet in the frontend preview.
- Added operational workbench summaries to module screens for therapy, assignments, inventory, allocations, events, alarms, tickets, work orders, recalls and firmware execution.
- Made localStorage migration tolerant of earlier saved state that lacks the new operational datasets.
- Corrected backend role permission checks to distinguish read and write access.
- Added resource-specific update field allowlists to the generic PATCH route.
- Made backend startup fail closed when JWT_SECRET is absent or shorter than 32 characters.
- Updated README and backend environment example.

## Not completed / requires environment and engineering work
- Frontend-to-PostgreSQL integration.
- Complete normalised schema for all ontology entities and 38 declared relationships.
- Full data import with FK validation and rejection reporting.
- Full CRUD/workflow endpoints and transaction-safe multi-entity operations.
- Real GIS route calculations, telemetry integrations, external alert feeds, SSO/MFA, production security review.
- End-to-end validation of SCN1-SCN5.

This is an expanded development build, not a production-certified healthcare application. The frontend preview is synthetic and capped at 100 records per sheet.
