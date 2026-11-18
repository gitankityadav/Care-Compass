from app.database import get_db_pool
from psycopg.rows import dict_row

pool = get_db_pool()
pool.open()

try:
    with pool.connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute("""
                SELECT audit_id, action, performed_by, scenario_id
                FROM audit_log
                ORDER BY event_datetime_utc DESC
                LIMIT 5
            """)

            for row in cursor.fetchall():
                print(row)

            cursor.execute("""
                SELECT column_name, column_default
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'audit_log'
                ORDER BY ordinal_position
            """)

            print("\nCOLUMN DEFAULTS:")
            for row in cursor.fetchall():
                print(row)
finally:
    pool.close()
