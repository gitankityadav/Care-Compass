from app.database import get_db_pool
from psycopg.rows import dict_row

pool = get_db_pool()
pool.open()

try:
    with pool.connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute("""
                SELECT
                    scenario_id,
                    COUNT(*) AS record_count
                FROM audit_log
                GROUP BY scenario_id
                ORDER BY scenario_id
            """)

            for row in cursor.fetchall():
                print(row)
finally:
    pool.close()
