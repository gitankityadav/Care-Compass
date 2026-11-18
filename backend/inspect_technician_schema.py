from app.database import get_db_pool

pool = get_db_pool()

try:
    pool.open(wait=True)
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'technician_master'
                ORDER BY ordinal_position
            """)

            for row in cur.fetchall():
                print(f"{row[0]} | {row[1]} | nullable={row[2]}")
finally:
    pool.close()
