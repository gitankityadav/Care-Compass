import json
from psycopg.rows import dict_row
from app.database import get_db_pool

pool = get_db_pool()

queries = {
    "therapy_sessions": """
        SELECT *
        FROM therapy_sessions
        WHERE scenario_id = 'SCN2'
    """,
    "nurse_assignments": """
        SELECT *
        FROM nurse_patient_assignment
        WHERE scenario_id = 'SCN2'
    """,
    "patients": """
        SELECT *
        FROM patients
        WHERE patient_id IN (
            SELECT patient_id
            FROM therapy_sessions
            WHERE scenario_id = 'SCN2'
        )
    """,
    "interventions": """
        SELECT *
        FROM intervention_cases
        WHERE scenario_id = 'SCN2'
    """,
    "audit": """
        SELECT *
        FROM audit_log
        WHERE scenario_id = 'SCN2'
    """
}

try:
    pool.open(wait=True)
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            for name, query in queries.items():
                cur.execute(query)
                rows = cur.fetchall()
                print(f"\n--- {name}: {len(rows)} rows ---")
                print(json.dumps(rows, indent=2, default=str))
finally:
    pool.close()
