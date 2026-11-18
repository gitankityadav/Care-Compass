from psycopg.rows import dict_row
from app.database import get_db_pool
from app.routes.scenarios import inspect_scn1_completion

pool = get_db_pool()

try:
    pool.open(wait=True)
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            result = inspect_scn1_completion(cur)
            print("SCN1 COMPLETION CHECK:")
            for key, value in result.items():
                print(f"{key}: {value}")
finally:
    pool.close()
