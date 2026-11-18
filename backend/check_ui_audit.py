from app.database import get_db_pool

pool = get_db_pool()
pool.open()

try:
    with pool.connection() as connection:
        result = connection.execute("""
            SELECT COUNT(*)
            FROM audit_log
            WHERE scenario_id = 'UI'
        """)
        print("Existing UI audit entries:", result.fetchone()[0])
finally:
    pool.close()
