from psycopg.rows import dict_row
from app.database import get_db_pool
from app.routes.scenarios import inspect_scn2_completion

pool = get_db_pool()

try:
    pool.open(wait=True)
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            print(inspect_scn2_completion(cur))
finally:
    pool.close()
