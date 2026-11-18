import json
from psycopg.rows import dict_row
from app.database import get_db_pool
from app.routes.scenarios import scenario_snapshot

pool = get_db_pool()

try:
    pool.open(wait=True)

    with pool.connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            for scenario_id in ["SCN3", "SCN4", "SCN5"]:
                print("\n" + "=" * 70)
                print(f" {scenario_id} SCENARIO INSPECTION")
                print("=" * 70)

                records = scenario_snapshot(cursor, scenario_id)

                for table, rows in records.items():
                    print(f"\n{table}: {len(rows)} row(s)")
                    print(json.dumps(rows, default=str, indent=2))

finally:
    pool.close()
