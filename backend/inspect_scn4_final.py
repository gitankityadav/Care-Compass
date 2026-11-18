from psycopg.rows import dict_row
from app.database import get_db_pool
from app.routes.scenarios import scenario_snapshot

pool = get_db_pool()
try:
    pool.open(wait=True)
    with pool.connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            data = scenario_snapshot(cursor, "SCN4")
            records = data.get("records", {})

            for table in ["recall_cases", "device_patient_assignment",
                          "risk_register", "intervention_cases",
                          "service_tickets", "work_orders"]:
                rows = records.get(table, [])
                print(f"\n{table}: {len(rows)}")
                for row in rows:
                    print(row)
finally:
    pool.close()
