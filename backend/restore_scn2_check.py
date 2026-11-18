from pathlib import Path

path = Path("backend/app/routes/scenarios.py")
source = path.read_text(encoding="utf-8")

if "def inspect_scn2_completion(cursor):" in source:
    print("SCN2 completion function already exists. No change made.")
    raise SystemExit(0)

marker = "def inspect_scn3_completion(cursor):"

if marker not in source:
    raise SystemExit("Could not find the SCN3 function. No change made.")

function_code = '''def inspect_scn2_completion(cursor):
    records = scenario_snapshot(cursor, "SCN2")

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


'''

source = source.replace(marker, function_code + marker, 1)
path.write_text(source, encoding="utf-8")
print("SCN2 completion function restored successfully.")
