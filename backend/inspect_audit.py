from app.database import get_db_pool
from psycopg.rows import dict_row

pool = get_db_pool()
pool.open()

try:
    with pool.connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'audit_log'
                ORDER BY ordinal_position
            """)

            for row in cursor.fetchall():
                print(
                    f"{row['column_name']} | "
                    f"{row['data_type']} | "
                    f"Nullable: {row['is_nullable']}"
                )
finally:
    pool.close()
