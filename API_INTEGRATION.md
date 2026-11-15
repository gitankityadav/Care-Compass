# Frontend ↔ PostgreSQL integration and scenario engine

The React application uses `VITE_API_URL` (default `http://localhost:4000`).

## Live data
At startup `src/App.jsx` requests all 27 operational tables through:
`GET /api/data/:table?limit=50000`

The existing six workspaces are hydrated from the PostgreSQL result sets. The dashboard shows connection state and falls back to the bundled preview only when the API cannot be reached.

## Persistent UI actions
- Patient nurse reassignment → `PATCH /api/data/patients/:patient_id`
- Shipment status update → `PATCH /api/data/logistics_shipments/:shipment_id`
- Device operational status update → `PATCH /api/data/medical_devices/:device_id`
- Nurse availability update → `PATCH /api/data/nurses/:nurse_id`
- Resilience alert status update → `PATCH /api/data/resilience_alerts/:alert_id`
- Create resilience alert → `POST /api/data/resilience_alerts`

The PATCH route is allowlisted and writes an audit row. The alert creation endpoint writes the new alert to PostgreSQL.

## Golden scenario engine
- `GET /api/scenarios` lists SCN1–SCN5.
- `GET /api/scenarios/:id` returns the linked source records for the requested scenario.
- `POST /api/scenarios/:id/execute` runs the scenario's idempotent transaction, applies missing target-state updates, checks the linked records, and returns step-level validation results.
- The Executive Twin includes Run & Verify controls for the five source-defined scenarios.
- `npm run validate:scenarios` in `server/` runs a database-backed acceptance check across all five traces.

Scenario mapping is source-derived from the workbook's `Golden_scenarios` and `scenario_id` links:
- SCN1 Storm Disruption: supply plan → patient allocation → shipment → distribution centre → resilience alert → shipment events.
- SCN2 Missed Therapy: missed session → deactivate previous nurse assignment → active replacement assignment → completed intervention. The patient master nurse pointer is synchronized to the replacement.
- SCN3 Device Failure: device → alarm → service ticket → technician → closed work order.
- SCN4 Device Recall: recall → device-patient assignment → patient risk → intervention → closed work order.
- SCN5 Firmware Update Campaign: exactly 20 device executions and one audit row per execution.

Important: scenario actions are transaction-backed and idempotent. The source workbook already contains completed synthetic traces; execution verifies and restores their expected final state if any linked target field is incomplete. The browser-based tests and verification against your actual hosted database still need to be run after deployment.

## Known source-data warnings surfaced by the runner
The workbook's scenario-linked rows contain two label mismatches that are not corrected by the application:
- SCN1: `patient_supply_plan.item_name`, `shipment_patient_allocation.item_name`, and `logistics_shipments.supply_category` do not all carry the same label.
- SCN4: `recall_cases.manufacturer/model` do not match the linked `medical_devices.manufacturer/model` for the scenario device.
The scenario runner returns these as warnings and preserves the original synthetic values. These should be reviewed by the data owner if exact item/device identity consistency is required.
