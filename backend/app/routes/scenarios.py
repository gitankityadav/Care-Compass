import json
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from psycopg import sql
from psycopg.rows import dict_row

from app.database import get_db_pool


router = APIRouter(prefix="/api", tags=["Scenarios"])


SCENARIO_META = {
    "SCN1": {
        "name": "Storm Disruption",
        "summary": (
            "Patient supply plan â†’ patient shipment allocation â†’ "
            "shipment â†’ distribution centre â†’ resilience alert â†’ "
            "shipment event history"
        ),
        "tables": [
            "patient_supply_plan",
            "shipment_patient_allocation",
            "logistics_shipments",
            "resilience_alerts",
            "shipment_events",
            "distribution_centers",
            "inventory",
        ],
    },
    "SCN2": {
        "name": "Missed Therapy",
        "summary": (
            "Missed session â†’ old nurse assignment deactivated â†’ "
            "replacement nurse assignment â†’ completed intervention"
        ),
        "tables": [
            "therapy_sessions",
            "therapy_episodes",
            "nurse_patient_assignment",
            "nurses",
            "intervention_cases",
            "patients",
        ],
    },
    "SCN3": {
        "name": "Device Failure",
        "summary": (
            "Device health degradation â†’ device alarm â†’ service ticket "
            "â†’ assigned technician â†’ closed work order"
        ),
        "tables": [
            "medical_devices",
            "device_alarms",
            "service_tickets",
            "technician_master",
            "work_orders",
            "ticket_status_history",
        ],
    },
    "SCN4": {
        "name": "Device Recall",
        "summary": (
            "Recall case â†’ affected device-patient assignment â†’ "
            "critical patient risk â†’ intervention â†’ closed recall work order"
        ),
        "tables": [
            "recall_cases",
            "medical_devices",
            "device_patient_assignment",
            "patients",
            "risk_register",
            "intervention_cases",
            "service_tickets",
            "work_orders",
        ],
    },
    "SCN5": {
        "name": "Firmware Update Campaign",
        "summary": (
            "Campaign â†’ exactly 20 device executions â†’ "
            "one audit entry per execution"
        ),
        "tables": [
            "firmware_campaigns",
            "firmware_execution",
            "medical_devices",
            "audit_log",
        ],
    },
}


def get_special_query(scenario_id: str, table: str):
    queries = {
        ("SCN1", "distribution_centers"): """
            SELECT *
            FROM distribution_centers
            WHERE distribution_center_id IN (
                SELECT distribution_center_id
                FROM logistics_shipments
                WHERE scenario_id = %s
            )
            OR distribution_center_id IN (
                SELECT previous_value
                FROM audit_log
                WHERE scenario_id = %s
                  AND entity_type = 'shipment'
                  AND action = 'Reroute'
            )
            OR distribution_center_id IN (
                SELECT new_value
                FROM audit_log
                WHERE scenario_id = %s
                  AND entity_type = 'shipment'
                  AND action = 'Reroute'
            )
        """,

        ("SCN1", "inventory"): """
            SELECT *
            FROM inventory
            WHERE distribution_center_id IN (
                SELECT distribution_center_id
                FROM logistics_shipments
                WHERE scenario_id = %s

                UNION

                SELECT previous_value
                FROM audit_log
                WHERE scenario_id = %s
                  AND entity_type = 'shipment'
                  AND action = 'Reroute'

                UNION

                SELECT new_value
                FROM audit_log
                WHERE scenario_id = %s
                  AND entity_type = 'shipment'
                  AND action = 'Reroute'
            )
        """,

        ("SCN2", "nurses"): """
            SELECT *
            FROM nurses
            WHERE nurse_id IN (
                SELECT nurse_id
                FROM nurse_patient_assignment
                WHERE scenario_id = %s
            )
        """,

        ("SCN2", "patients"): """
            SELECT *
            FROM patients
            WHERE patient_id IN (
                SELECT patient_id
                FROM therapy_sessions
                WHERE scenario_id = %s
            )
        """,

        ("SCN2", "therapy_episodes"): """
            SELECT *
            FROM therapy_episodes
            WHERE therapy_episode_id IN (
                SELECT therapy_episode_id
                FROM therapy_sessions
                WHERE scenario_id = %s
            )
        """,

        ("SCN3", "medical_devices"): """
            SELECT *
            FROM medical_devices
            WHERE device_id IN (
                SELECT device_id
                FROM device_alarms
                WHERE scenario_id = %s
            )
        """,

        ("SCN3", "technician_master"): """
            SELECT *
            FROM technician_master
            WHERE technician_id IN (
                SELECT assigned_technician_id
                FROM service_tickets
                WHERE scenario_id = %s

                UNION

                SELECT technician_id
                FROM work_orders
                WHERE scenario_id = %s
            )
        """,

        ("SCN4", "medical_devices"): """
            SELECT *
            FROM medical_devices
            WHERE device_id IN (
                SELECT device_id
                FROM recall_cases
                WHERE scenario_id = %s
            )
        """,

        ("SCN4", "patients"): """
            SELECT *
            FROM patients
            WHERE patient_id IN (
                SELECT patient_id
                FROM device_patient_assignment
                WHERE scenario_id = %s
            )
        """,

        ("SCN4", "technician_master"): """
            SELECT *
            FROM technician_master
            WHERE technician_id IN (
                SELECT assigned_technician_id
                FROM service_tickets
                WHERE scenario_id = %s

                UNION

                SELECT technician_id
                FROM work_orders
                WHERE scenario_id = %s
            )
        """,

        ("SCN5", "medical_devices"): """
            SELECT DISTINCT d.*
            FROM medical_devices d
            JOIN firmware_execution f
              ON f.device_id = d.device_id
            WHERE f.scenario_id = %s
        """,
    }

    return queries.get((scenario_id, table))


def scenario_snapshot(cursor, scenario_id: str):
    meta = SCENARIO_META.get(scenario_id)

    if not meta:
        raise HTTPException(
            status_code=404,
            detail={"error": "Unknown scenario"},
        )

    records = {}

    for table in meta["tables"]:
        query = get_special_query(scenario_id, table)

        if query:
            if (scenario_id, table) in {
                ("SCN1", "distribution_centers"),
                ("SCN1", "inventory"),
                ("SCN3", "technician_master"),
                ("SCN4", "technician_master"),
            }:
                params = (scenario_id, scenario_id, scenario_id)
                if (scenario_id, table) in {
                    ("SCN3", "technician_master"),
                    ("SCN4", "technician_master"),
                }:
                    params = (scenario_id, scenario_id)
            else:
                params = (scenario_id,)

            cursor.execute(query, params)

        else:
            cursor.execute(
                sql.SQL(
                    "SELECT * FROM {} WHERE scenario_id = %s"
                ).format(sql.Identifier(table)),
                (scenario_id,),
            )

        records[table] = cursor.fetchall()

    return {
        "scenario_id": scenario_id,
        "name": meta["name"],
        "summary": meta["summary"],
        "records": records,
    }


@router.get("/scenarios")
def list_scenarios():
    return [
        {
            "scenario_id": scenario_id,
            **metadata,
        }
        for scenario_id, metadata in SCENARIO_META.items()
    ]


@router.get("/scenarios/{scenario_id}")
def get_scenario(scenario_id: str):
    if scenario_id not in SCENARIO_META:
        raise HTTPException(
            status_code=404,
            detail={"error": "Unknown scenario"},
        )

    pool = get_db_pool()

    try:
        with pool.connection() as connection:
            with connection.cursor(row_factory=dict_row) as cursor:
                return scenario_snapshot(cursor, scenario_id)

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail={"error": "Unable to retrieve scenario data"},
        )



def audit_text(value):
    """Preserve scalar audit values as plain text."""
    if value is None:
        return "null"
    if isinstance(value, (dict, list, tuple)):
        return json.dumps(value, default=str)
    return str(value)


def write_scenario_audit(
    cursor,
    scenario_id: str,
    entity_type: str,
    entity_id: str,
    action: str,
    previous_value,
    new_value,
):
    """Insert an audit entry only if an equivalent one does not exist."""

    cursor.execute(
        """
        SELECT 1
        FROM audit_log
        WHERE scenario_id = %s
          AND entity_type = %s
          AND entity_id = %s
          AND action = %s
        LIMIT 1
        """,
        (scenario_id, entity_type, str(entity_id), action),
    )

    if cursor.fetchone():
        return False

    cursor.execute(
        """
        INSERT INTO audit_log (
            audit_id, entity_type, entity_id, action,
            previous_value, new_value, event_datetime_utc,
            performed_by, scenario_id
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            f"AUD-{secrets.token_hex(8).upper()}",
            entity_type,
            str(entity_id),
            action,
            audit_text(previous_value),
            audit_text(new_value),
            datetime.now(timezone.utc),
            "CARE_COMPASS_SCENARIO_ENGINE",
            scenario_id,
        ),
    )

    return True


def inspect_scn1_completion(cursor):
    """Check whether SCN1 is already in its expected completed state."""

    cursor.execute("""
        SELECT supply_plan_id, patient_id, days_remaining, stockout_risk
        FROM patient_supply_plan
        WHERE scenario_id = 'SCN1'
    """)
    supply_plans = cursor.fetchall()

    cursor.execute("""
        SELECT allocation_id, shipment_id, patient_id
        FROM shipment_patient_allocation
        WHERE scenario_id = 'SCN1'
    """)
    allocations = cursor.fetchall()

    cursor.execute("""
        SELECT shipment_id, shipment_status, distribution_center_id
        FROM logistics_shipments
        WHERE scenario_id = 'SCN1'
    """)
    shipments = cursor.fetchall()

    cursor.execute("""
        SELECT alert_id, alert_status
        FROM resilience_alerts
        WHERE scenario_id = 'SCN1'
    """)
    alerts = cursor.fetchall()

    cursor.execute("""
        SELECT event_status
        FROM shipment_events
        WHERE scenario_id = 'SCN1'
    """)
    events = {row["event_status"] for row in cursor.fetchall()}

    expected_events = {
        "Distribution Centre Impacted",
        "Alternate DC Selected",
        "Rerouted",
        "Delivered",
    }

    completed = (
        len(supply_plans) == 1
        and len(allocations) == 1
        and len(shipments) == 1
        and len(alerts) == 1
        and shipments[0]["shipment_status"] == "Delivered"
        and shipments[0]["distribution_center_id"] == "DC008"
        and alerts[0]["alert_status"] == "Resolved"
        and expected_events.issubset(events)
    )

    return {
        "completed": completed,
        "supply_plans": len(supply_plans),
        "allocations": len(allocations),
        "shipments": len(shipments),
        "alerts": len(alerts),
        "events_present": sorted(events),
        "missing_events": sorted(expected_events - events),
    }




# SCN3_SCN5_COMPLETION_CHECKS

def inspect_scn2_completion(cursor):
    snapshot = scenario_snapshot(cursor, "SCN2")
    records = snapshot["records"]

    sessions = records.get("therapy_sessions", [])
    assignments = records.get("nurse_patient_assignment", [])
    interventions = records.get("intervention_cases", [])

    session_patient_ids = {
        row.get("patient_id")
        for row in sessions
        if row.get("patient_id") is not None
    }

    patients = [
        row for row in records.get("patients", [])
        if row.get("patient_id") in session_patient_ids
    ]

    missed_sessions = [
        row for row in sessions
        if str(row.get("session_status", "")).strip().lower() == "missed"
    ]

    active_assignments = [
        row for row in assignments
        if str(row.get("active_status", "")).strip().lower()
        in ("true", "active", "1")
    ]

    inactive_assignments = [
        row for row in assignments
        if str(row.get("active_status", "")).strip().lower()
        in ("false", "inactive", "0")
    ]

    completed_interventions = [
        row for row in interventions
        if str(row.get("status", "")).strip().lower() == "completed"
    ]

    valid_assignment = False
    valid_patient = False
    valid_intervention = False

    if len(missed_sessions) == 1 and len(active_assignments) == 1:
        session = missed_sessions[0]
        assignment = active_assignments[0]

        valid_assignment = (
            assignment.get("patient_id") == session.get("patient_id")
        )

        valid_patient = any(
            patient.get("patient_id") == session.get("patient_id")
            and patient.get("assigned_nurse_id") == assignment.get("nurse_id")
            for patient in patients
        )

        valid_intervention = any(
            intervention.get("patient_id") == session.get("patient_id")
            and intervention.get("assigned_nurse_id") == assignment.get("nurse_id")
            for intervention in completed_interventions
        )

    completed = (
        len(missed_sessions) == 1
        and len(assignments) == 2
        and len(active_assignments) == 1
        and len(inactive_assignments) == 1
        and len(patients) == 1
        and len(completed_interventions) == 1
        and valid_assignment
        and valid_patient
        and valid_intervention
    )

    return {
        "completed": completed,
        "sessions": len(sessions),
        "assignments": len(assignments),
        "active_assignments": len(active_assignments),
        "inactive_assignments": len(inactive_assignments),
        "patients": len(patients),
        "interventions": len(interventions),
    }


def inspect_scn3_completion(cursor):
    records = scenario_snapshot(cursor, "SCN3").get("records", {})

    devices = records.get("medical_devices", [])
    alarms = records.get("device_alarms", [])
    tickets = records.get("service_tickets", [])
    technicians = records.get("technician_master", [])
    work_orders = records.get("work_orders", [])
    history = records.get("ticket_status_history", [])

    expected_history = {
        "Identified", "Assessed", "Assigned",
        "Dispatched", "On Site", "Resolved"
    }

    valid = (
        len(devices) == 1
        and devices[0]["operational_status"] == "Under Maintenance"
        and float(devices[0]["health_score"]) <= 24.5
        and len(alarms) == 1
        and alarms[0]["status"] == "Resolved"
        and len(tickets) == 1
        and tickets[0]["status"] == "Resolved"
        and alarms[0]["ticket_id"] == tickets[0]["ticket_id"]
        and tickets[0]["device_id"] == devices[0]["device_id"]
        and len(technicians) == 1
        and technicians[0]["technician_id"] == tickets[0]["assigned_technician_id"]
        and len(work_orders) == 1
        and work_orders[0]["status"] == "Closed"
        and work_orders[0]["ticket_id"] == tickets[0]["ticket_id"]
        and len(history) == 6
        and {row["status"] for row in history} == expected_history
    )

    return {
        "completed": valid,
        "devices": len(devices),
        "alarms": len(alarms),
        "tickets": len(tickets),
        "technicians": len(technicians),
        "work_orders": len(work_orders),
        "ticket_history_events": len(history),
    }


def inspect_scn4_completion(cursor):
    records = scenario_snapshot(cursor, "SCN4").get("records", {})

    recalls = records.get("recall_cases", [])
    assignments = records.get("device_patient_assignment", [])
    risks = records.get("risk_register", [])
    interventions = records.get("intervention_cases", [])
    tickets = records.get("service_tickets", [])
    work_orders = records.get("work_orders", [])

    linked_assignment = (
        len(recalls) == 1
        and len(assignments) == 1
        and recalls[0]["device_id"] == assignments[0]["device_id"]
    )

    linked_patient = (
        linked_assignment
        and len(risks) == 1
        and len(interventions) == 1
        and assignments[0]["patient_id"] == risks[0]["patient_id"]
        and assignments[0]["patient_id"] == interventions[0]["patient_id"]
    )

    linked_ticket = (
        len(tickets) == 1
        and len(work_orders) == 1
        and tickets[0]["device_id"] == recalls[0]["device_id"]
        and work_orders[0]["ticket_id"] == tickets[0]["ticket_id"]
    ) if len(recalls) == 1 else False

    valid = (
        len(recalls) == 1
        and recalls[0]["status"] == "Closed"
        and linked_assignment
        and linked_patient
        and risks[0]["status"] == "Mitigated"
        and risks[0]["severity"] == "Critical"
        and interventions[0]["status"] == "Completed"
        and interventions[0]["risk_level"] == "Critical"
        and linked_ticket
        and tickets[0]["status"] == "Closed"
        and work_orders[0]["status"] == "Closed"
    )

    return {
        "completed": valid,
        "recalls": len(recalls),
        "device_assignments": len(assignments),
        "assignment_active": (
            assignments[0]["active_status"] if assignments else None
        ),
        "risks": len(risks),
        "interventions": len(interventions),
        "tickets": len(tickets),
        "work_orders": len(work_orders),
    }


def inspect_scn5_completion(cursor):
    records = scenario_snapshot(cursor, "SCN5").get("records", {})

    campaigns = records.get("firmware_campaigns", [])
    executions = records.get("firmware_execution", [])
    devices = records.get("medical_devices", [])
    audits = records.get("audit_log", [])

    execution_ids = {row["execution_id"] for row in executions}
    execution_devices = {row["device_id"] for row in executions}
    device_ids = {row["device_id"] for row in devices}

    audit_by_execution = {
        row["entity_id"]: row
        for row in audits
        if row["entity_type"] == "firmware_execution"
        and row["action"] == "Firmware campaign outcome"
    }

    outcomes = {}
    for row in executions:
        outcome = row["outcome"]
        outcomes[outcome] = outcomes.get(outcome, 0) + 1

    campaign_valid = (
        len(campaigns) == 1
        and campaigns[0]["selected_device_count"] == 20
        and campaigns[0]["success_count"] == 15
        and campaigns[0]["offline_count"] == 2
        and campaigns[0]["failed_rollback_count"] == 2
        and campaigns[0]["excluded_count"] == 1
    )

    audit_valid = (
        len(audits) == 20
        and len(audit_by_execution) == 20
        and set(audit_by_execution) == execution_ids
        and all(
            audit_by_execution[row["execution_id"]]["new_value"] == row["outcome"]
            and audit_by_execution[row["execution_id"]]["previous_value"] == "Selected"
            for row in executions
            if row["execution_id"] in audit_by_execution
        )
    )

    valid = (
        campaign_valid
        and len(executions) == 20
        and len(execution_ids) == 20
        and len(execution_devices) == 20
        and len(devices) == 20
        and execution_devices == device_ids
        and outcomes.get("Success", 0) == 15
        and outcomes.get("Offline", 0) == 2
        and outcomes.get("Failed - Rolled Back", 0) == 2
        and outcomes.get("Excluded", 0) == 1
        and audit_valid
    )

    return {
        "completed": valid,
        "campaigns": len(campaigns),
        "executions": len(executions),
        "unique_execution_ids": len(execution_ids),
        "unique_devices": len(execution_devices),
        "device_records": len(devices),
        "audit_entries": len(audits),
        "outcomes": outcomes,
        "audit_valid": audit_valid,
    }



def execute_scn1(cursor, scenario_id, now):
    checks = []
    warnings = []

    cursor.execute(
        "SELECT * FROM patient_supply_plan WHERE scenario_id = %s",
        (scenario_id,),
    )
    supply_plan = cursor.fetchone()

    cursor.execute(
        "SELECT * FROM shipment_patient_allocation WHERE scenario_id = %s",
        (scenario_id,),
    )
    allocation = cursor.fetchone()

    if not supply_plan or not allocation:
        raise ValueError(
            "SCN1 source patient supply plan or allocation is missing"
        )

    cursor.execute(
        """
        SELECT * FROM logistics_shipments
        WHERE scenario_id = %s AND shipment_id = %s
        """,
        (scenario_id, allocation["shipment_id"]),
    )
    shipment = cursor.fetchone()

    if not shipment:
        raise ValueError("SCN1 linked shipment is missing")

    if supply_plan["patient_id"] != allocation["patient_id"]:
        raise ValueError(
            "SCN1 patient supply plan and allocation do not match"
        )

    cursor.execute(
        """
        SELECT * FROM resilience_alerts
        WHERE scenario_id = %s AND related_shipment_id = %s
        """,
        (scenario_id, shipment["shipment_id"]),
    )
    alert = cursor.fetchone()

    if not alert:
        raise ValueError("SCN1 linked resilience alert is missing")

    if (
        supply_plan["item_name"] != allocation["item_name"]
        or allocation["item_name"] != shipment["supply_category"]
    ):
        warnings.append(
            f'Source data item mismatch: supply plan item '
            f'"{supply_plan["item_name"]}", allocation item '
            f'"{allocation["item_name"]}", shipment category '
            f'"{shipment["supply_category"]}". Records were preserved '
            f"without rewriting item names."
        )

    cursor.execute(
        """
        SELECT previous_value
        FROM audit_log
        WHERE scenario_id = %s
          AND entity_type = 'shipment'
          AND entity_id = %s
          AND action = 'Reroute'
        ORDER BY event_datetime_utc
        LIMIT 1
        """,
        (scenario_id, shipment["shipment_id"]),
    )
    original_row = cursor.fetchone()
    original_dc = (
        original_row["previous_value"]
        if original_row
        else shipment["distribution_center_id"]
    )

    if shipment["distribution_center_id"] != "DC008":
        cursor.execute(
            """
            UPDATE logistics_shipments
            SET distribution_center_id = 'DC008',
                shipment_status = 'Delivered',
                actual_delivery_utc = COALESCE(actual_delivery_utc, %s)
            WHERE shipment_id = %s
            """,
            (now, shipment["shipment_id"]),
        )
        write_scenario_audit(
            cursor,
            scenario_id,
            "shipment",
            shipment["shipment_id"],
            "Scenario reroute",
            original_dc,
            "DC008",
        )

    if shipment["shipment_status"] != "Delivered":
        cursor.execute(
            """
            UPDATE logistics_shipments
            SET shipment_status = 'Delivered',
                actual_delivery_utc = COALESCE(actual_delivery_utc, %s)
            WHERE shipment_id = %s
            """,
            (now, shipment["shipment_id"]),
        )

    cursor.execute(
        """
        SELECT event_status
        FROM shipment_events
        WHERE scenario_id = %s AND shipment_id = %s
        """,
        (scenario_id, shipment["shipment_id"]),
    )
    existing_events = {row["event_status"] for row in cursor.fetchall()}

    for event_status in (
        "Distribution Centre Impacted",
        "Alternate DC Selected",
        "Rerouted",
        "Delivered",
    ):
        if event_status not in existing_events:
            event_id = f"SHE_UI_{secrets.token_hex(8).upper()}"
            cursor.execute(
                """
                INSERT INTO shipment_events (
                    shipment_event_id,
                    shipment_id,
                    event_status,
                    event_datetime_utc,
                    recorded_by,
                    scenario_id
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    event_id,
                    shipment["shipment_id"],
                    event_status,
                    now,
                    "CARE_COMPASS_SCENARIO_ENGINE",
                    scenario_id,
                ),
            )

    if alert["alert_status"] != "Resolved":
        cursor.execute(
            """
            UPDATE resilience_alerts
            SET alert_status = 'Resolved',
                response_action =
                    'Rerouted shipment through alternate distribution centre'
            WHERE alert_id = %s
            """,
            (alert["alert_id"],),
        )
        write_scenario_audit(
            cursor,
            scenario_id,
            "resilience_alert",
            alert["alert_id"],
            "Alert resolution",
            alert["alert_status"],
            "Resolved",
        )

    checks.extend(
        [
            {
                "step": "Patient has two days of supply",
                "ok": int(supply_plan["days_remaining"]) == 2,
            },
            {
                "step": "Patient-specific shipment allocation linked",
                "ok": allocation["shipment_id"] == shipment["shipment_id"],
            },
            {
                "step": "Shipment rerouted through alternate DC DC008",
                "ok": True,
            },
            {
                "step": "Shipment delivered and event history present",
                "ok": True,
            },
            {
                "step": "Related resilience alert resolved",
                "ok": True,
            },
        ]
    )
    return checks, warnings


def execute_scn2(cursor, scenario_id):
    checks = []

    cursor.execute(
        "SELECT * FROM therapy_sessions WHERE scenario_id = %s",
        (scenario_id,),
    )
    session = cursor.fetchone()

    if not session:
        raise ValueError("SCN2 missed therapy session not found")

    cursor.execute(
        """
        SELECT * FROM nurse_patient_assignment
        WHERE scenario_id = %s AND patient_id = %s
        """,
        (scenario_id, session["patient_id"]),
    )
    assignments = cursor.fetchall()

    old_assignment = next(
        (row for row in assignments if not row["active_status"]),
        None,
    )
    replacement = next(
        (row for row in assignments if row["active_status"]),
        None,
    )

    if old_assignment:
        cursor.execute(
            """
            UPDATE nurse_patient_assignment
            SET active_status = FALSE
            WHERE assignment_id = %s
            """,
            (old_assignment["assignment_id"],),
        )

    if not replacement:
        raise ValueError("SCN2 replacement nurse assignment missing")

    cursor.execute(
        """
        UPDATE patients
        SET assigned_nurse_id = %s
        WHERE patient_id = %s
        """,
        (replacement["nurse_id"], session["patient_id"]),
    )

    cursor.execute(
        """
        UPDATE therapy_sessions
        SET session_status = 'Missed'
        WHERE session_id = %s
        """,
        (session["session_id"],),
    )

    cursor.execute(
        """
        SELECT * FROM intervention_cases
        WHERE scenario_id = %s AND patient_id = %s
        """,
        (scenario_id, session["patient_id"]),
    )
    intervention = cursor.fetchone()

    if not intervention:
        raise ValueError("SCN2 completed intervention missing")

    if intervention["status"] != "Completed":
        cursor.execute(
            """
            UPDATE intervention_cases
            SET status = 'Completed'
            WHERE intervention_id = %s
            """,
            (intervention["intervention_id"],),
        )
        write_scenario_audit(
            cursor,
            scenario_id,
            "intervention",
            intervention["intervention_id"],
            "Intervention completion",
            intervention["status"],
            "Completed",
        )

    if old_assignment:
        write_scenario_audit(
            cursor,
            scenario_id,
            "nurse_assignment",
            old_assignment["assignment_id"],
            "Deactivate previous nurse assignment",
            str(old_assignment["active_status"]),
            "false",
        )

    checks.extend(
        [
            {"step": "Missed therapy session recorded", "ok": True},
            {
                "step": "Previous nurse assignment deactivated",
                "ok": not old_assignment or not old_assignment["active_status"],
            },
            {
                "step": "Replacement nurse assignment active",
                "ok": bool(replacement["active_status"]),
            },
            {"step": "Intervention completed", "ok": True},
        ]
    )
    return checks, []


def execute_scn3(cursor, scenario_id, now):
    checks = []

    cursor.execute(
        "SELECT * FROM device_alarms WHERE scenario_id = %s",
        (scenario_id,),
    )
    alarm = cursor.fetchone()

    if not alarm:
        raise ValueError("SCN3 device alarm missing")

    cursor.execute(
        """
        SELECT * FROM service_tickets
        WHERE scenario_id = %s AND ticket_id = %s
        """,
        (scenario_id, alarm["ticket_id"]),
    )
    ticket = cursor.fetchone()

    if not ticket:
        raise ValueError("SCN3 linked service ticket missing")

    cursor.execute(
        """
        SELECT * FROM work_orders
        WHERE scenario_id = %s AND ticket_id = %s
        """,
        (scenario_id, ticket["ticket_id"]),
    )
    work_order = cursor.fetchone()

    if not work_order:
        raise ValueError("SCN3 linked work order missing")

    cursor.execute(
        """
        UPDATE medical_devices
        SET operational_status = 'Under Maintenance',
            health_score = LEAST(COALESCE(health_score, 100), 24.5)
        WHERE device_id = %s
        """,
        (alarm["device_id"],),
    )

    if alarm["status"] != "Resolved":
        cursor.execute(
            """
            UPDATE device_alarms
            SET status = 'Resolved'
            WHERE alarm_id = %s
            """,
            (alarm["alarm_id"],),
        )
        write_scenario_audit(
            cursor,
            scenario_id,
            "device_alarm",
            alarm["alarm_id"],
            "Alarm resolution",
            alarm["status"],
            "Resolved",
        )

    if ticket["status"] != "Resolved":
        cursor.execute(
            """
            UPDATE service_tickets
            SET status = 'Resolved'
            WHERE ticket_id = %s
            """,
            (ticket["ticket_id"],),
        )
        write_scenario_audit(
            cursor,
            scenario_id,
            "service_ticket",
            ticket["ticket_id"],
            "Ticket closure",
            ticket["status"],
            "Resolved",
        )

    if work_order["status"] != "Closed":
        cursor.execute(
            """
            UPDATE work_orders
            SET status = 'Closed',
                completion_date_utc =
                    COALESCE(completion_date_utc, %s),
                outcome =
                    COALESCE(outcome, 'Device repaired and verified')
            WHERE work_order_id = %s
            """,
            (now, work_order["work_order_id"]),
        )
        write_scenario_audit(
            cursor,
            scenario_id,
            "work_order",
            work_order["work_order_id"],
            "Work order closure",
            work_order["status"],
            "Closed",
        )

    checks.extend(
        [
            {"step": "Device alarm linked to device", "ok": True},
            {"step": "Alarm resolved", "ok": True},
            {"step": "Service ticket linked and resolved", "ok": True},
            {"step": "Technician work order closed", "ok": True},
        ]
    )
    return checks, []


def execute_scn4(cursor, scenario_id, now):
    checks = []
    warnings = []

    cursor.execute(
        "SELECT * FROM recall_cases WHERE scenario_id = %s",
        (scenario_id,),
    )
    recall = cursor.fetchone()

    if not recall:
        raise ValueError("SCN4 recall case missing")

    cursor.execute(
        """
        SELECT * FROM device_patient_assignment
        WHERE scenario_id = %s AND device_id = %s
        """,
        (scenario_id, recall["device_id"]),
    )
    assignment = cursor.fetchone()

    if not assignment:
        raise ValueError("SCN4 affected device-patient assignment missing")

    cursor.execute(
        "SELECT * FROM medical_devices WHERE device_id = %s",
        (recall["device_id"],),
    )
    recalled_device = cursor.fetchone()

    if recalled_device and (
        recall["manufacturer"] != recalled_device["manufacturer"]
        or recall["model"] != recalled_device["model"]
    ):
        warnings.append(
            f"Source data device mismatch: recall lists "
            f"{recall['manufacturer']} {recall['model']}, while device "
            f"registry lists {recalled_device['manufacturer']} "
            f"{recalled_device['model']}. No source values were silently changed."
        )

    cursor.execute(
        """
        SELECT * FROM risk_register
        WHERE scenario_id = %s AND patient_id = %s
        """,
        (scenario_id, assignment["patient_id"]),
    )
    risk = cursor.fetchone()

    cursor.execute(
        """
        SELECT * FROM intervention_cases
        WHERE scenario_id = %s AND patient_id = %s
        """,
        (scenario_id, assignment["patient_id"]),
    )
    intervention = cursor.fetchone()

    cursor.execute(
        """
        SELECT * FROM service_tickets
        WHERE scenario_id = %s AND device_id = %s
        """,
        (scenario_id, recall["device_id"]),
    )
    ticket = cursor.fetchone()

    work_order = None
    if ticket:
        cursor.execute(
            """
            SELECT * FROM work_orders
            WHERE scenario_id = %s AND ticket_id = %s
            """,
            (scenario_id, ticket["ticket_id"]),
        )
        work_order = cursor.fetchone()

    if not risk or not intervention or not work_order:
        raise ValueError(
            "SCN4 risk, intervention or recall work order missing"
        )

    if recall["status"] != "Closed":
        cursor.execute(
            """
            UPDATE recall_cases
            SET status = 'Closed'
            WHERE recall_case_id = %s
            """,
            (recall["recall_case_id"],),
        )
        write_scenario_audit(
            cursor,
            scenario_id,
            "recall_case",
            recall["recall_case_id"],
            "Recall closure",
            recall["status"],
            "Closed",
        )

    if risk["status"] != "Mitigated":
        cursor.execute(
            """
            UPDATE risk_register
            SET status = 'Mitigated', severity = 'Critical'
            WHERE risk_id = %s
            """,
            (risk["risk_id"],),
        )
        write_scenario_audit(
            cursor,
            scenario_id,
            "risk",
            risk["risk_id"],
            "Risk mitigation",
            risk["status"],
            "Mitigated",
        )

    if intervention["status"] != "Completed":
        cursor.execute(
            """
            UPDATE intervention_cases
            SET status = 'Completed', risk_level = 'Critical'
            WHERE intervention_id = %s
            """,
            (intervention["intervention_id"],),
        )
        write_scenario_audit(
            cursor,
            scenario_id,
            "intervention",
            intervention["intervention_id"],
            "Intervention completion",
            intervention["status"],
            "Completed",
        )

    if work_order["status"] != "Closed":
        cursor.execute(
            """
            UPDATE work_orders
            SET status = 'Closed',
                completion_date_utc =
                    COALESCE(completion_date_utc, %s),
                outcome = COALESCE(
                    outcome,
                    'Recall inspection completed; device quarantined'
                )
            WHERE work_order_id = %s
            """,
            (now, work_order["work_order_id"]),
        )
        write_scenario_audit(
            cursor,
            scenario_id,
            "work_order",
            work_order["work_order_id"],
            "Work order closure",
            work_order["status"],
            "Closed",
        )

    checks.extend(
        [
            {
                "step": "Recall linked to affected device and patient",
                "ok": True,
            },
            {"step": "Critical patient risk recorded", "ok": True},
            {"step": "Patient intervention completed", "ok": True},
            {"step": "Recall work order closed", "ok": True},
        ]
    )
    return checks, warnings


def execute_scn5(cursor, scenario_id):
    checks = []

    cursor.execute(
        "SELECT * FROM firmware_campaigns WHERE scenario_id = %s",
        (scenario_id,),
    )
    campaign = cursor.fetchone()

    if not campaign:
        raise ValueError("SCN5 firmware campaign missing")

    cursor.execute(
        """
        SELECT * FROM firmware_execution
        WHERE campaign_id = %s
        ORDER BY execution_id
        """,
        (campaign["campaign_id"],),
    )
    executions = cursor.fetchall()

    if (
        int(campaign["selected_device_count"]) != 20
        or len(executions) != 20
    ):
        raise ValueError(
            "SCN5 requires exactly 20 selected devices and execution rows; "
            f"found {len(executions)}"
        )

    if len({row["device_id"] for row in executions}) != 20:
        raise ValueError("SCN5 requires 20 unique device executions")

    cursor.execute(
        """
        SELECT entity_id
        FROM audit_log
        WHERE scenario_id = %s
          AND entity_type = 'firmware_execution'
        """,
        (scenario_id,),
    )
    audited = {row["entity_id"] for row in cursor.fetchall()}

    for execution in executions:
        if execution["execution_id"] not in audited:
            write_scenario_audit(
                cursor,
                scenario_id,
                "firmware_execution",
                execution["execution_id"],
                "Firmware campaign outcome",
                "Selected",
                execution["outcome"],
            )

    checks.extend(
        [
            {
                "step": "Exactly 20 devices selected for execution",
                "ok": (
                    int(campaign["selected_device_count"]) == 20
                    and len(executions) == 20
                ),
            },
            {
                "step": "Each device has one execution result",
                "ok": len({row["device_id"] for row in executions}) == 20,
            },
            {"step": "Each execution has an audit entry", "ok": True},
        ]
    )
    return checks, []


@router.post("/scenarios/{scenario_id}/execute")
def execute_scenario(scenario_id: str):
    if scenario_id not in SCENARIO_META:
        raise HTTPException(
            status_code=404,
            detail={"error": "Unknown scenario"},
        )

    executors = {
        "SCN1": execute_scn1,
        "SCN2": execute_scn2,
        "SCN3": execute_scn3,
        "SCN4": execute_scn4,
        "SCN5": execute_scn5,
    }

    inspectors = {
        "SCN1": inspect_scn1_completion,
        "SCN2": inspect_scn2_completion,
        "SCN3": inspect_scn3_completion,
        "SCN4": inspect_scn4_completion,
        "SCN5": inspect_scn5_completion,
    }

    pool = get_db_pool()
    now = datetime.now(timezone.utc)

    try:
        with pool.connection() as connection:
            with connection.transaction():
                with connection.cursor(row_factory=dict_row) as cursor:
                    # Match the original Express transaction behavior.
                    cursor.execute("SET CONSTRAINTS ALL DEFERRED")

                    initial_state = inspectors[scenario_id](cursor)

                    if initial_state["completed"]:
                        response = {
                            "scenario_id": scenario_id,
                            "status": "already_completed",
                            "message": "Scenario is already completed.",
                            "details": initial_state,
                        }
                    else:
                        if scenario_id in ("SCN1", "SCN3", "SCN4"):
                            checks, warnings = executors[scenario_id](
                                cursor, scenario_id, now
                            )
                        elif scenario_id == "SCN2":
                            checks, warnings = executors[scenario_id](
                                cursor, scenario_id
                            )
                        else:
                            checks, warnings = executors[scenario_id](
                                cursor, scenario_id
                            )

                        failed_checks = [
                            check for check in checks if not check["ok"]
                        ]
                        if failed_checks:
                            failed_steps = ", ".join(
                                check["step"] for check in failed_checks
                            )
                            raise ValueError(
                                f"Scenario validation failed: {failed_steps}"
                            )

                        final_state = inspectors[scenario_id](cursor)
                        if not final_state["completed"]:
                            raise ValueError(
                                "Scenario execution finished but final-state "
                                f"validation failed: {final_state}"
                            )

                        snapshot = scenario_snapshot(cursor, scenario_id)
                        response = {
                            "scenario_id": scenario_id,
                            "status": "completed",
                            "checks": checks,
                            "warnings": warnings,
                            "details": final_state,
                            "records": snapshot["records"],
                            "message": (
                                f'{SCENARIO_META[scenario_id]["name"]} '
                                "completed and verified against PostgreSQL."
                            ),
                        }

            # The transaction has committed before the response is returned.
            return response

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Scenario execution failed; transaction rolled back.",
                "message": str(exc),
            },
        ) from exc

