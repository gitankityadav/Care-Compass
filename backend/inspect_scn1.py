import json
from psycopg.rows import dict_row
from app.database import get_db_pool

pool = get_db_pool()

queries = {
    "supply_plans": """
        SELECT supply_plan_id, patient_id, item_name,
               days_remaining, stockout_risk, scenario_id
        FROM patient_supply_plan
        WHERE scenario_id = 'SCN1'
    """,
    "allocations": """
        SELECT allocation_id, shipment_id, patient_id,
               item_name, allocated_quantity, scenario_id
        FROM shipment_patient_allocation
        WHERE scenario_id = 'SCN1'
    """,
    "shipments": """
        SELECT shipment_id, shipment_status, distribution_center_id,
               estimated_delivery_utc, actual_delivery_utc, scenario_id
        FROM logistics_shipments
        WHERE scenario_id = 'SCN1'
    """,
    "alerts": """
        SELECT alert_id, related_shipment_id, alert_status,
               response_action, scenario_id
        FROM resilience_alerts
        WHERE scenario_id = 'SCN1'
    """,
    "destination_dc": """
        SELECT distribution_center_id
        FROM distribution_centers
        WHERE distribution_center_id = 'DC008'
    """,
    "shipment_events": """
        SELECT shipment_event_id, shipment_id, event_status,
               event_datetime_utc, scenario_id
        FROM shipment_events
        WHERE scenario_id = 'SCN1'
    """
}

try:
    pool.open(wait=True)
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            for name, query in queries.items():
                cur.execute(query)
                rows = cur.fetchall()
                print(f"\n--- {name} ({len(rows)} rows) ---")
                print(json.dumps(rows, indent=2, default=str))
finally:
    pool.close()
