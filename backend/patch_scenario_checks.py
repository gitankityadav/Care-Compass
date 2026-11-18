from pathlib import Path

path = Path("backend/app/routes/scenarios.py")
source = path.read_text(encoding="utf-8-sig")

marker = '@router.post("/scenarios/{scenario_id}/execute")'
patch_marker = "# SCN3_SCN5_COMPLETION_CHECKS"

if patch_marker in source:
    raise SystemExit("Patch already applied. No changes made.")

if marker not in source:
    raise SystemExit("Execution endpoint marker not found. No changes made.")

prefix, _ = source.split(marker, 1)

detectors = r'''

# SCN3_SCN5_COMPLETION_CHECKS

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


'''

new_endpoint = r'''
@router.post("/scenarios/{scenario_id}/execute")
def execute_scenario(scenario_id: str):
    if scenario_id not in SCENARIO_META:
        raise HTTPException(
            status_code=404,
            detail={"error": "Unknown scenario"},
        )

    inspectors = {
        "SCN1": inspect_scn1_completion,
        "SCN2": inspect_scn2_completion,
        "SCN3": inspect_scn3_completion,
        "SCN4": inspect_scn4_completion,
        "SCN5": inspect_scn5_completion,
    }

    if scenario_id not in inspectors:
        raise HTTPException(
            status_code=501,
            detail={"error": "Scenario execution not implemented yet"},
        )

    pool = get_db_pool()

    try:
        with pool.connection() as connection:
            with connection.transaction():
                with connection.cursor(row_factory=dict_row) as cursor:
                    result = inspectors[scenario_id](cursor)

                    if result["completed"]:
                        return {
                            "scenario_id": scenario_id,
                            "status": "already_completed",
                            "message": "Scenario is already completed.",
                            "details": result,
                        }

                    return {
                        "scenario_id": scenario_id,
                        "status": "not_completed",
                        "message": "Scenario execution logic is not enabled yet.",
                        "details": result,
                    }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={"error": "Scenario completion check failed", "message": str(exc)},
        ) from exc
'''

path.write_text(prefix + detectors + new_endpoint, encoding="utf-8")
print("Scenario completion checks updated successfully.")
