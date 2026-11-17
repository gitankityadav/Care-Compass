from fastapi import APIRouter, HTTPException, Query
from psycopg.rows import dict_row

from app.database import get_db_pool

router = APIRouter(prefix="/api", tags=["Data"])

TABLES = [
    "hospitals",
    "patients",
    "nurses",
    "medical_devices",
    "logistics_shipments",
    "resilience_alerts",
    "distribution_centers",
    "suppliers",
    "inventory",
    "therapy_episodes",
    "therapy_sessions",
    "nurse_patient_assignment",
    "device_patient_assignment",
    "patient_supply_plan",
    "shipment_patient_allocation",
    "shipment_events",
    "technician_master",
    "device_alarms",
    "service_tickets",
    "work_orders",
    "intervention_cases",
    "recall_cases",
    "firmware_campaigns",
    "firmware_execution",
    "audit_log",
    "ticket_status_history",
    "risk_register",
]


@router.get("/tables")
def get_tables():
    return {"tables": TABLES}


@router.get("/summary")
def get_summary():
    pool = get_db_pool()

    try:
        counts = {}

        with pool.connection() as connection:
            with connection.cursor(row_factory=dict_row) as cursor:
                for table in TABLES:
                    cursor.execute(
                        f'SELECT COUNT(*) AS count FROM "{table}"'
                    )
                    result = cursor.fetchone()
                    counts[table] = int(result["count"])

        return {
            "counts": counts,
            "total": sum(counts.values()),
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail={"error": "Unable to load summary"},
        )


@router.get("/data/{table}")
def get_table_data(
    table: str,
    limit: int = Query(default=100, ge=1, le=50000),
    offset: int = Query(default=0, ge=0),
):
    if table not in TABLES:
        raise HTTPException(
            status_code=404,
            detail={"error": "Unknown table"},
        )

    pool = get_db_pool()

    try:
        with pool.connection() as connection:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    f'SELECT * FROM "{table}" LIMIT %s OFFSET %s',
                    (limit, offset),
                )
                rows = cursor.fetchall()

        return {
            "table": table,
            "limit": limit,
            "offset": offset,
            "rows": rows,
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail={"error": "Query failed"},
        )
