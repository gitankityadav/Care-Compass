import json
from psycopg.rows import dict_row
from app.database import get_db_pool

pool = get_db_pool()

try:
    pool.open(wait=True)
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT *
                FROM audit_log
                WHERE scenario_id = 'SCN1'
                ORDER BY event_datetime_utc
            """)
            rows = cur.fetchall()
            print(json.dumps(rows, indent=2, default=str))
finally:
    pool.close()
