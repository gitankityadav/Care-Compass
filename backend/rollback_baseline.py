from app.database import get_db_pool

pool = get_db_pool()
pool.open()

try:
    with pool.connection() as connection:
        patient = connection.execute("""
            SELECT assigned_nurse_id
            FROM patients
            WHERE patient_id = 'PAT000001'
        """).fetchone()

        audit = connection.execute("""
            SELECT COUNT(*) FROM audit_log
        """).fetchone()

        print("Original nurse assignment:", patient[0])
        print("Original audit count:", audit[0])
finally:
    pool.close()
