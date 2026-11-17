import json
import secrets
import time

from typing import Any
from fastapi import APIRouter, HTTPException, Request, Body
from psycopg import sql
from psycopg.rows import dict_row

from app.database import get_db_pool

router = APIRouter(prefix="/api", tags=["Mutations"])


PK_MAP = {
    "patients": "patient_id",
    "nurses": "nurse_id",
    "medical_devices": "device_id",
    "logistics_shipments": "shipment_id",
    "resilience_alerts": "alert_id",
    "service_tickets": "ticket_id",
    "work_orders": "work_order_id",
    "therapy_sessions": "session_id",
    "nurse_patient_assignment": "assignment_id",
    "intervention_cases": "intervention_id",
    "inventory": "inventory_id",
    "resilience_alerts": "alert_id",
}

WRITABLE = {
    "patients": ["assigned_nurse_id", "discharge_status"],
    "nurses": ["employment_status", "current_patient_load"],
    "medical_devices": ["operational_status"],
    "logistics_shipments": [
        "shipment_status",
        "distribution_center_id",
        "estimated_delivery_utc",
        "actual_delivery_utc",
    ],
    "resilience_alerts": [
        "alert_status",
        "response_action",
        "end_datetime_utc",
    ],
    "service_tickets": ["status", "assigned_technician_id"],
    "work_orders": ["status", "outcome", "completion_date_utc"],
    "therapy_sessions": ["session_status"],
    "nurse_patient_assignment": ["active_status"],
    "intervention_cases": ["status"],
    "inventory": ["on_hand_qty", "reserved_qty", "available_qty"],
}


POST_TABLES = {
    "resilience_alerts": "alert_id",
    "shipment_events": "shipment_event_id",
    "intervention_cases": "intervention_id",
    "risk_register": "risk_id",
    "work_orders": "work_order_id",
    "ticket_status_history": "ticket_status_event_id",
}


def generate_audit_id():
    return (
        f"AUD-{int(time.time() * 1000)}-"
        f"{secrets.token_hex(3)}"
    )


@router.patch("/data/{table}/{record_id}")
async def update_record(
    table: str,
    record_id: str,
    body: dict[str, Any] = Body(...)
):
    primary_key = PK_MAP.get(table)
    allowed_fields = WRITABLE.get(table)

    if not primary_key or not allowed_fields:
        raise HTTPException(
            status_code=403,
            detail={"error": "Table is read-only"},
        )

    

    entries = [
        (key, value)
        for key, value in body.items()
        if key in allowed_fields
    ]

    if not entries:
        raise HTTPException(
            status_code=400,
            detail={"error": "No permitted fields supplied"},
        )

    scenario_id = body.get("scenario_id") or "UI"

    if scenario_id != "UI" and scenario_id not in {
        "SCN1", "SCN2", "SCN3", "SCN4", "SCN5"
    }:
        raise HTTPException(
            status_code=400,
            detail={"error": "Invalid scenario_id"},
        )

    columns = [key for key, _ in entries]
    pool = get_db_pool()

    try:
        with pool.connection() as connection:
            with connection.transaction():
                with connection.cursor(row_factory=dict_row) as cursor:
                    cursor.execute(
                        sql.SQL(
                            "SELECT * FROM {} WHERE {} = %s FOR UPDATE"
                        ).format(
                            sql.Identifier(table),
                            sql.Identifier(primary_key),
                        ),
                        (record_id,),
                    )

                    before = cursor.fetchone()

                    if before is None:
                        raise HTTPException(
                            status_code=404,
                            detail={"error": "Record not found"},
                        )

                    assignments = sql.SQL(", ").join(
                        sql.SQL("{} = %s").format(sql.Identifier(column))
                        for column in columns
                    )

                    values = [value for _, value in entries]
                    values.append(record_id)

                    cursor.execute(
                        sql.SQL(
                            "UPDATE {} SET {} WHERE {} = %s RETURNING *"
                        ).format(
                            sql.Identifier(table),
                            assignments,
                            sql.Identifier(primary_key),
                        ),
                        values,
                    )

                    updated = cursor.fetchone()

                    cursor.execute(
                        """
                        INSERT INTO audit_log (
                            audit_id,
                            event_datetime_utc,
                            entity_type,
                            entity_id,
                            action,
                            previous_value,
                            new_value,
                            performed_by,
                            scenario_id
                        )
                        VALUES (%s, NOW(), %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            generate_audit_id(),
                            table,
                            record_id,
                            "UPDATE",
                            json.dumps(before, default=str),
                            json.dumps(updated, default=str),
                            "CARE_COMPASS_UI",
                            scenario_id,
                        ),
                    )

        return {"row": updated}

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail={"error": "Update failed"},
        )


@router.post("/data/{table}", status_code=201)
async def create_record(
    table: str,
    body: dict[str, Any] = Body(...)
):
    primary_key = POST_TABLES.get(table)

    if not primary_key:
        raise HTTPException(
            status_code=403,
            detail={"error": "Table is not writable"},
        )

    

    if not body:
        raise HTTPException(
            status_code=400,
            detail={"error": "Empty record"},
        )

    if primary_key not in body or body[primary_key] is None:
        raise HTTPException(
            status_code=400,
            detail={"error": f"Missing primary key: {primary_key}"},
        )

    pool = get_db_pool()

    try:
        with pool.connection() as connection:
            with connection.transaction():
                with connection.cursor(row_factory=dict_row) as cursor:

                    # Get actual columns from PostgreSQL.
                    cursor.execute(
                        """
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = %s
                        ORDER BY ordinal_position
                        """,
                        (table,),
                    )

                    actual_columns = {
                        row["column_name"]
                        for row in cursor.fetchall()
                    }

                    unknown_columns = set(body.keys()) - actual_columns

                    if unknown_columns:
                        raise HTTPException(
                            status_code=400,
                            detail={
                                "error": "Unknown columns supplied",
                                "columns": sorted(unknown_columns),
                            },
                        )

                    columns = list(body.keys())
                    values = [body[column] for column in columns]

                    column_sql = sql.SQL(", ").join(
                        sql.Identifier(column)
                        for column in columns
                    )

                    placeholders = sql.SQL(", ").join(
                        sql.Placeholder()
                        for _ in columns
                    )

                    insert_query = sql.SQL(
                        "INSERT INTO {} ({}) VALUES ({}) RETURNING *"
                    ).format(
                        sql.Identifier(table),
                        column_sql,
                        placeholders,
                    )

                    cursor.execute(insert_query, values)
                    created = cursor.fetchone()

                    # Match the existing Express behavior:
                    # only resilience_alerts creation creates an audit row.
                    if table == "resilience_alerts":
                        scenario_id = created.get("scenario_id") or "UI"

                        cursor.execute(
                            """
                            INSERT INTO audit_log (
                                audit_id,
                                event_datetime_utc,
                                entity_type,
                                entity_id,
                                action,
                                previous_value,
                                new_value,
                                performed_by,
                                scenario_id
                            )
                            VALUES (%s, NOW(), %s, %s, %s, %s, %s, %s, %s)
                            """,
                            (
                                generate_audit_id(),
                                table,
                                created[primary_key],
                                "CREATE",
                                json.dumps(None),
                                json.dumps(created, default=str),
                                "CARE_COMPASS_UI",
                                scenario_id,
                            ),
                        )

        return {"row": created}

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=400,
            detail={"error": "Insert failed"},
        )
