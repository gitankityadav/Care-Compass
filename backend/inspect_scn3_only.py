from psycopg.rows import dict_row
from app.database import get_db_pool
from app.routes.scenarios import scenario_snapshot

pool = get_db_pool()
try:
    pool.open(wait=True)
    with pool.connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            data = scenario_snapshot(cursor, "SCN3")
            for table, rows in data.get("records", {}).items():
                print(f"\n{table}: {len(rows)}")
                for row in rows:
                    print(row)
finally:
    pool.close()
