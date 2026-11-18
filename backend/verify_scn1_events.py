from psycopg.rows import dict_row
from app.database import get_db_pool

pool = get_db_pool()

try:
    pool.open(wait=True)
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT event_status, LENGTH(event_status) AS text_length
                FROM shipment_events
                WHERE scenario_id = 'SCN1'
                ORDER BY event_datetime_utc
            """)
            for row in cur.fetchall():
                print(row)
finally:
    pool.close()
