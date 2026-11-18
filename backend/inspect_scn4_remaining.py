from psycopg.rows import dict_row
from app.database import get_db_pool
from app.routes.scenarios import scenario_snapshot

pool = get_db_pool()
try:
    pool.open(wait=True)
    with pool.connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            records = scenario_snapshot(cursor, "SCN4").get("records", {})
            for table in ["recall_cases", "device_patient_assignment"]:
                print(f"\n{table}")
                for row in records.get(table, []):
                    print(row)
finally:
    pool.close()
