from app.database import get_db_pool
from psycopg.rows import dict_row

pool = get_db_pool()
pool.open()

try:
    with pool.connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute("""
                SELECT
                    table_name,
                    column_name,
                    data_type,
                    is_nullable
                FROM information_schema.columns
                WHERE table_name IN ('audit_log', 'patients')
                ORDER BY table_name, ordinal_position
            """)

            for row in cursor.fetchall():
                print(row)
finally:
    pool.close()
