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
    "risk_register": "risk_id",
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
    "risk_register": ["status"],
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
    request: Request,
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
                            request.headers.get("x-user-name", "CARE_COMPASS_UI"),
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


@router.post("/iot/trigger", status_code=201)
async def trigger_iot_alert(body: dict[str, Any] = Body(...)):
    """Atomically record an IoT event, patient risk, and assigned nurse intervention."""
    required = ("patient_id", "hospital_id", "assigned_nurse_id", "risk_type", "severity", "device_id", "observation")
    missing = [key for key in required if not body.get(key)]
    if missing:
        raise HTTPException(status_code=400, detail={"error": "Missing required fields", "fields": missing})

    stamp = int(time.time() * 1000)
    risk_id = f"RSK-IOT-{stamp}"
    intervention_id = f"INT-IOT-{stamp}"
    event_time = body.get("event_datetime_utc") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    risk = {
        "risk_id": risk_id,
        "patient_id": body["patient_id"],
        "hospital_id": body["hospital_id"],
        "risk_type": body["risk_type"],
        "severity": body["severity"],
        "status": "Open",
        "identified_datetime_utc": event_time,
        "scenario_id": None,
    }
    intervention = {
        "intervention_id": intervention_id,
        "patient_id": body["patient_id"],
        "therapy_episode_id": body.get("therapy_episode_id"),
        "assigned_nurse_id": body["assigned_nurse_id"],
        "intervention_type": f"{body['risk_type']} · {body['device_id']} · {body['observation']}",
        "risk_level": body["severity"],
        "status": "Assigned",
        "created_datetime_utc": event_time,
        "scenario_id": None,
    }

    pool = get_db_pool()
    try:
        with pool.connection() as connection:
            with connection.transaction():
                with connection.cursor(row_factory=dict_row) as cursor:
                    for table, record, pk in (
                        ("risk_register", risk, "risk_id"),
                        ("intervention_cases", intervention, "intervention_id"),
                    ):
                        cursor.execute(
                            """
                            SELECT column_name
                            FROM information_schema.columns
                            WHERE table_schema = 'public' AND table_name = %s
                            """,
                            (table,),
                        )
                        actual = {row["column_name"] for row in cursor.fetchall()}
                        unknown = set(record) - actual
                        if unknown:
                            raise HTTPException(
                                status_code=400,
                                detail={"error": f"Unexpected columns for {table}", "columns": sorted(unknown)},
                            )
                        cols = list(record)
                        cursor.execute(
                            sql.SQL("INSERT INTO {} ({}) VALUES ({}) RETURNING *").format(
                                sql.Identifier(table),
                                sql.SQL(", ").join(sql.Identifier(col) for col in cols),
                                sql.SQL(", ").join(sql.Placeholder() for _ in cols),
                            ),
                            [record[col] for col in cols],
                        )
                        created = cursor.fetchone()
                        if created is None or created.get(pk) != record[pk]:
                            raise RuntimeError(f"Could not persist {table}")

                    cursor.execute(
                        """
                        INSERT INTO audit_log (
                            audit_id, event_datetime_utc, entity_type, entity_id,
                            action, previous_value, new_value, performed_by, scenario_id
                        ) VALUES (%s, NOW(), %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            generate_audit_id(), "iot_device", body["device_id"],
                            "TRIGGER_ALERT",
                            json.dumps(None),
                            json.dumps({
                                "patient_id": body["patient_id"],
                                "risk_id": risk_id,
                                "intervention_id": intervention_id,
                                "severity": body["severity"],
                                "observation": body["observation"],
                            }),
                            body.get("device_name", "Bedside IoT Monitor"),
                            "UI",
                        ),
                    )
        return {
            "event_id": f"IOT-{stamp}",
            "risk": risk,
            "intervention": intervention,
            "message": "IoT event and nurse response records committed",
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"error": "IoT event could not be committed", "reason": str(exc)})
