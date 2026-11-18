from app.database import get_db_pool

pool = get_db_pool()

try:
    pool.open(wait=True)

    tables = [
        "patient_supply_plan",
        "shipment_patient_allocation",
        "logistics_shipments",
        "resilience_alerts",
        "shipment_events",
        "therapy_sessions",
        "nurse_patient_assignment",
        "intervention_cases",
        "patients",
        "device_alarms",
        "medical_devices",
        "service_tickets",
        "work_orders",
        "recall_cases",
        "device_patient_assignment",
        "risk_register",
        "firmware_campaigns",
        "firmware_execution",
        "audit_log",
    ]

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT table_name, column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = ANY(%s)
                ORDER BY table_name, ordinal_position
            """, (tables,))

            for table, column, dtype, nullable in cur.fetchall():
                print(f"{table}.{column} | {dtype} | nullable={nullable}")

finally:
    pool.close()
