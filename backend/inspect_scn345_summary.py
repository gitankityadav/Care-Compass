from psycopg.rows import dict_row
from app.database import get_db_pool
from app.routes.scenarios import scenario_snapshot

pool = get_db_pool()

try:
    pool.open(wait=True)

    with pool.connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            for sid in ["SCN3", "SCN4", "SCN5"]:
                snapshot = scenario_snapshot(cursor, sid)
                print(f"\n{'='*55}\n{sid}: {snapshot.get('name')}\n{'='*55}")

                for table, rows in snapshot.get("records", {}).items():
                    print(f"\n{table}: {len(rows)} rows")

                    for row in rows:
                        fields = [
                            "device_id", "alarm_id", "ticket_id",
                            "work_order_id", "recall_case_id",
                            "device_assignment_id", "patient_id",
                            "risk_id", "intervention_id",
                            "campaign_id", "execution_id",
                            "operational_status", "health_score",
                            "status", "severity", "active_status",
                            "outcome", "action", "entity_id"
                        ]
                        selected = {k: row[k] for k in fields if k in row}
                        if selected:
                            print(selected)
finally:
    pool.close()
