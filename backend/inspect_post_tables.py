from app.database import get_db_pool
from psycopg.rows import dict_row

TABLES = [
    "resilience_alerts",
    "shipment_events",
    "intervention_cases",
    "risk_register",
    "work_orders",
    "ticket_status_history",
]

pool = get_db_pool()
pool.open()

try:
    with pool.connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            for table in TABLES:
                print(f"\n--- {table} ---")

                cursor.execute("""
                    SELECT
                        c.column_name,
                        c.data_type,
                        c.is_nullable,
                        c.column_default,
                        CASE WHEN pk.column_name IS NOT NULL
                             THEN 'PRIMARY KEY'
                             ELSE ''
                        END AS key_type
                    FROM information_schema.columns c
                    LEFT JOIN (
                        SELECT kcu.table_name, kcu.column_name
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu
                          ON tc.constraint_name = kcu.constraint_name
                         AND tc.constraint_schema = kcu.constraint_schema
                        WHERE tc.constraint_type = 'PRIMARY KEY'
                          AND tc.table_schema = 'public'
                    ) pk
                      ON pk.table_name = c.table_name
                     AND pk.column_name = c.column_name
                    WHERE c.table_schema = 'public'
                      AND c.table_name = %s
                    ORDER BY c.ordinal_position
                """, (table,))

                for row in cursor.fetchall():
                    print(row)
finally:
    pool.close()
