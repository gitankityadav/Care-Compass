-- Care Compass PostgreSQL schema generated from approved Data Schema v1.0

-- 27 operational tables / 275 source columns; types aligned to approved schema v1.0.

-- 38 relationship_map FKs plus shipment.hospital_id and the documented alarm-ticket link.

BEGIN;

CREATE TABLE IF NOT EXISTS "hospitals" (
  "hospital_id" VARCHAR(64) NOT NULL,
  "hospital_name" TEXT NOT NULL,
  "hospital_type" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" VARCHAR(64) NOT NULL,
  "zip_code" VARCHAR(5) NOT NULL,
  "licensed_beds" INTEGER NOT NULL,
  "occupied_beds" INTEGER NOT NULL,
  "occupancy_rate" NUMERIC(7,3) NOT NULL,
  "icu_beds" INTEGER NOT NULL,
  "icu_occupied_beds" INTEGER NOT NULL,
  "ed_capacity" INTEGER NOT NULL,
  "latitude" NUMERIC(10,7) NOT NULL,
  "longitude" NUMERIC(10,7) NOT NULL,
  "ehr_system" TEXT NOT NULL,
  "last_updated_utc" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "pk_hospitals" PRIMARY KEY ("hospital_id")
);

CREATE TABLE IF NOT EXISTS "patients" (
  "patient_id" VARCHAR(64) NOT NULL,
  "hospital_id" VARCHAR(64) NOT NULL,
  "assigned_nurse_id" VARCHAR(64) NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "age" INTEGER NOT NULL,
  "sex_at_birth" VARCHAR(64) NOT NULL,
  "city" TEXT NOT NULL,
  "state" VARCHAR(64) NOT NULL,
  "zip_code" VARCHAR(5) NOT NULL,
  "encounter_type" TEXT NOT NULL,
  "primary_condition" TEXT NOT NULL,
  "acuity_level" TEXT NOT NULL,
  "risk_score" NUMERIC(7,3) NOT NULL,
  "readmission_risk_30d" NUMERIC(7,3) NOT NULL,
  "admission_datetime_utc" TIMESTAMPTZ NOT NULL,
  "discharge_status" TEXT NOT NULL,
  "synthetic_record" BOOLEAN NOT NULL,
  CONSTRAINT "pk_patients" PRIMARY KEY ("patient_id")
);

CREATE TABLE IF NOT EXISTS "nurses" (
  "nurse_id" VARCHAR(64) NOT NULL,
  "hospital_id" VARCHAR(64) NOT NULL,
  "full_name" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "specialty" TEXT NOT NULL,
  "shift" TEXT NOT NULL,
  "employment_status" TEXT NOT NULL,
  "patient_assignment_capacity" INTEGER NOT NULL,
  "current_patient_load" INTEGER NOT NULL,
  "license_state" VARCHAR(64) NOT NULL,
  "last_shift_start_utc" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "pk_nurses" PRIMARY KEY ("nurse_id")
);

CREATE TABLE IF NOT EXISTS "medical_devices" (
  "device_id" VARCHAR(64) NOT NULL,
  "hospital_id" VARCHAR(64) NOT NULL,
  "device_type" TEXT NOT NULL,
  "manufacturer" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "serial_number" VARCHAR(64) NOT NULL,
  "location_unit" TEXT NOT NULL,
  "operational_status" TEXT NOT NULL,
  "health_score" NUMERIC(7,3) NOT NULL,
  "battery_percent" INTEGER NOT NULL,
  "temperature_c" NUMERIC(7,3) NOT NULL,
  "last_maintenance_date" DATE NOT NULL,
  "next_maintenance_due" DATE NOT NULL,
  "telemetry_timestamp_utc" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "pk_medical_devices" PRIMARY KEY ("device_id")
);

CREATE TABLE IF NOT EXISTS "logistics_shipments" (
  "shipment_id" VARCHAR(64) NOT NULL,
  "hospital_id" VARCHAR(64) NOT NULL,
  "supplier_name" TEXT NOT NULL,
  "origin_city" TEXT NOT NULL,
  "origin_state" VARCHAR(64) NOT NULL,
  "origin_zip" VARCHAR(5) NOT NULL,
  "destination_city" TEXT NOT NULL,
  "destination_state" VARCHAR(64) NOT NULL,
  "destination_zip" VARCHAR(5) NOT NULL,
  "supply_category" TEXT NOT NULL,
  "item_description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_of_measure" VARCHAR(64) NOT NULL,
  "priority" TEXT NOT NULL,
  "shipment_status" TEXT NOT NULL,
  "tracking_number" VARCHAR(64) NOT NULL,
  "created_datetime_utc" TIMESTAMPTZ NOT NULL,
  "estimated_delivery_utc" TIMESTAMPTZ NOT NULL,
  "actual_delivery_utc" TIMESTAMPTZ,
  "temperature_excursion" BOOLEAN NOT NULL,
  "destination_hospital_id" VARCHAR(64) NOT NULL,
  "distribution_center_id" VARCHAR(64) NOT NULL,
  "supplier_id" VARCHAR(64) NOT NULL,
  "scenario_id" VARCHAR(64),
  CONSTRAINT "pk_logistics_shipments" PRIMARY KEY ("shipment_id")
);

CREATE TABLE IF NOT EXISTS "resilience_alerts" (
  "alert_id" VARCHAR(64) NOT NULL,
  "hospital_id" VARCHAR(64) NOT NULL,
  "alert_type" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "alert_status" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "affected_city" TEXT NOT NULL,
  "affected_state" TEXT NOT NULL,
  "affected_zip" VARCHAR(5) NOT NULL,
  "start_datetime_utc" TIMESTAMPTZ NOT NULL,
  "end_datetime_utc" TIMESTAMPTZ NOT NULL,
  "estimated_capacity_impact_pct" NUMERIC(7,3) NOT NULL,
  "patients_at_risk" INTEGER NOT NULL,
  "related_shipment_id" VARCHAR(64),
  "response_action" TEXT NOT NULL,
  "synthetic_record" BOOLEAN NOT NULL,
  "scenario_id" VARCHAR(64),
  CONSTRAINT "pk_resilience_alerts" PRIMARY KEY ("alert_id")
);

CREATE TABLE IF NOT EXISTS "distribution_centers" (
  "distribution_center_id" VARCHAR(64) NOT NULL,
  "name" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" VARCHAR(64) NOT NULL,
  "latitude" NUMERIC(10,7) NOT NULL,
  "longitude" NUMERIC(10,7) NOT NULL,
  "operational_status" TEXT NOT NULL,
  CONSTRAINT "pk_distribution_centers" PRIMARY KEY ("distribution_center_id")
);

CREATE TABLE IF NOT EXISTS "suppliers" (
  "supplier_id" VARCHAR(64) NOT NULL,
  "supplier_name" TEXT NOT NULL,
  "supplier_category" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  CONSTRAINT "pk_suppliers" PRIMARY KEY ("supplier_id")
);

CREATE TABLE IF NOT EXISTS "inventory" (
  "inventory_id" VARCHAR(64) NOT NULL,
  "distribution_center_id" VARCHAR(64) NOT NULL,
  "item_name" TEXT NOT NULL,
  "on_hand_qty" INTEGER NOT NULL,
  "reserved_qty" INTEGER NOT NULL,
  "available_qty" INTEGER NOT NULL,
  "reorder_threshold" INTEGER NOT NULL,
  CONSTRAINT "pk_inventory" PRIMARY KEY ("inventory_id")
);

CREATE TABLE IF NOT EXISTS "therapy_episodes" (
  "therapy_episode_id" VARCHAR(64) NOT NULL,
  "patient_id" VARCHAR(64) NOT NULL,
  "hospital_id" VARCHAR(64) NOT NULL,
  "therapy_type" TEXT NOT NULL,
  "clinical_focus" TEXT NOT NULL,
  "start_datetime_utc" TIMESTAMPTZ NOT NULL,
  "planned_end_datetime_utc" TIMESTAMPTZ NOT NULL,
  "status" TEXT NOT NULL,
  "care_plan_tier" TEXT NOT NULL,
  CONSTRAINT "pk_therapy_episodes" PRIMARY KEY ("therapy_episode_id")
);

CREATE TABLE IF NOT EXISTS "therapy_sessions" (
  "session_id" VARCHAR(64) NOT NULL,
  "therapy_episode_id" VARCHAR(64) NOT NULL,
  "patient_id" VARCHAR(64) NOT NULL,
  "scheduled_datetime_utc" TIMESTAMPTZ NOT NULL,
  "session_status" TEXT NOT NULL,
  "delivery_mode" TEXT NOT NULL,
  "scenario_id" VARCHAR(64),
  CONSTRAINT "pk_therapy_sessions" PRIMARY KEY ("session_id")
);

CREATE TABLE IF NOT EXISTS "nurse_patient_assignment" (
  "assignment_id" VARCHAR(64) NOT NULL,
  "nurse_id" VARCHAR(64) NOT NULL,
  "patient_id" VARCHAR(64) NOT NULL,
  "hospital_id" VARCHAR(64) NOT NULL,
  "care_role" TEXT NOT NULL,
  "start_datetime_utc" TIMESTAMPTZ NOT NULL,
  "visit_frequency" TEXT NOT NULL,
  "active_status" BOOLEAN NOT NULL,
  "scenario_id" VARCHAR(64),
  CONSTRAINT "pk_nurse_patient_assignment" PRIMARY KEY ("assignment_id")
);

CREATE TABLE IF NOT EXISTS "device_patient_assignment" (
  "device_assignment_id" VARCHAR(64) NOT NULL,
  "device_id" VARCHAR(64) NOT NULL,
  "patient_id" VARCHAR(64) NOT NULL,
  "hospital_id" VARCHAR(64) NOT NULL,
  "assigned_datetime_utc" TIMESTAMPTZ NOT NULL,
  "returned_datetime_utc" TIMESTAMPTZ,
  "active_status" BOOLEAN NOT NULL,
  "assignment_reason" TEXT NOT NULL,
  "scenario_id" VARCHAR(64),
  CONSTRAINT "pk_device_patient_assignment" PRIMARY KEY ("device_assignment_id")
);

CREATE TABLE IF NOT EXISTS "patient_supply_plan" (
  "supply_plan_id" VARCHAR(64) NOT NULL,
  "patient_id" VARCHAR(64) NOT NULL,
  "therapy_episode_id" VARCHAR(64) NOT NULL,
  "item_name" TEXT NOT NULL,
  "daily_usage" INTEGER NOT NULL,
  "days_remaining" INTEGER NOT NULL,
  "next_delivery_due_utc" TIMESTAMPTZ NOT NULL,
  "stockout_risk" TEXT NOT NULL,
  "scenario_id" VARCHAR(64),
  CONSTRAINT "pk_patient_supply_plan" PRIMARY KEY ("supply_plan_id")
);

CREATE TABLE IF NOT EXISTS "shipment_patient_allocation" (
  "allocation_id" VARCHAR(64) NOT NULL,
  "shipment_id" VARCHAR(64) NOT NULL,
  "patient_id" VARCHAR(64) NOT NULL,
  "hospital_id" VARCHAR(64) NOT NULL,
  "item_name" TEXT NOT NULL,
  "allocated_quantity" INTEGER NOT NULL,
  "impact_if_delayed" TEXT NOT NULL,
  "scenario_id" VARCHAR(64),
  CONSTRAINT "pk_shipment_patient_allocation" PRIMARY KEY ("allocation_id")
);

CREATE TABLE IF NOT EXISTS "shipment_events" (
  "shipment_event_id" VARCHAR(64) NOT NULL,
  "shipment_id" VARCHAR(64) NOT NULL,
  "event_status" TEXT NOT NULL,
  "event_datetime_utc" TIMESTAMPTZ NOT NULL,
  "recorded_by" TEXT NOT NULL,
  "scenario_id" VARCHAR(64),
  CONSTRAINT "pk_shipment_events" PRIMARY KEY ("shipment_event_id")
);

CREATE TABLE IF NOT EXISTS "technician_master" (
  "technician_id" VARCHAR(64) NOT NULL,
  "technician_name" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "specialization" TEXT NOT NULL,
  "certification" TEXT NOT NULL,
  "availability" TEXT NOT NULL,
  "current_workload" INTEGER NOT NULL,
  "latitude" NUMERIC(10,7) NOT NULL,
  "longitude" NUMERIC(10,7) NOT NULL,
  "base_state" VARCHAR(64) NOT NULL,
  CONSTRAINT "pk_technician_master" PRIMARY KEY ("technician_id")
);

CREATE TABLE IF NOT EXISTS "device_alarms" (
  "alarm_id" VARCHAR(64) NOT NULL,
  "device_id" VARCHAR(64) NOT NULL,
  "hospital_id" VARCHAR(64) NOT NULL,
  "triggered_datetime_utc" TIMESTAMPTZ NOT NULL,
  "alarm_type" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "ticket_id" VARCHAR(64) NOT NULL,
  "scenario_id" VARCHAR(64),
  CONSTRAINT "pk_device_alarms" PRIMARY KEY ("alarm_id")
);

CREATE TABLE IF NOT EXISTS "service_tickets" (
  "ticket_id" VARCHAR(64) NOT NULL,
  "device_id" VARCHAR(64) NOT NULL,
  "alarm_id" VARCHAR(64),
  "hospital_id" VARCHAR(64) NOT NULL,
  "ticket_created_utc" TIMESTAMPTZ NOT NULL,
  "priority" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "assigned_technician_id" VARCHAR(64) NOT NULL,
  "sla_hours" INTEGER NOT NULL,
  "scenario_id" VARCHAR(64),
  CONSTRAINT "pk_service_tickets" PRIMARY KEY ("ticket_id")
);

CREATE TABLE IF NOT EXISTS "work_orders" (
  "work_order_id" VARCHAR(64) NOT NULL,
  "ticket_id" VARCHAR(64) NOT NULL,
  "technician_id" VARCHAR(64) NOT NULL,
  "status" TEXT NOT NULL,
  "created_date_utc" TIMESTAMPTZ NOT NULL,
  "dispatch_date_utc" TIMESTAMPTZ NOT NULL,
  "completion_date_utc" TIMESTAMPTZ NOT NULL,
  "outcome" TEXT NOT NULL,
  "scenario_id" VARCHAR(64),
  CONSTRAINT "pk_work_orders" PRIMARY KEY ("work_order_id")
);

CREATE TABLE IF NOT EXISTS "intervention_cases" (
  "intervention_id" VARCHAR(64) NOT NULL,
  "patient_id" VARCHAR(64) NOT NULL,
  "therapy_episode_id" VARCHAR(64) NOT NULL,
  "assigned_nurse_id" VARCHAR(64) NOT NULL,
  "intervention_type" TEXT NOT NULL,
  "risk_level" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "created_datetime_utc" TIMESTAMPTZ NOT NULL,
  "scenario_id" VARCHAR(64),
  CONSTRAINT "pk_intervention_cases" PRIMARY KEY ("intervention_id")
);

CREATE TABLE IF NOT EXISTS "recall_cases" (
  "recall_case_id" VARCHAR(64) NOT NULL,
  "device_id" VARCHAR(64) NOT NULL,
  "manufacturer" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "firmware_version" VARCHAR(64) NOT NULL,
  "recall_version" VARCHAR(64) NOT NULL,
  "severity" TEXT NOT NULL,
  "recommended_action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "scenario_id" VARCHAR(64),
  CONSTRAINT "pk_recall_cases" PRIMARY KEY ("recall_case_id")
);

CREATE TABLE IF NOT EXISTS "firmware_campaigns" (
  "campaign_id" VARCHAR(64) NOT NULL,
  "campaign_name" TEXT NOT NULL,
  "target_firmware_version" VARCHAR(64) NOT NULL,
  "selection_datetime_utc" TIMESTAMPTZ NOT NULL,
  "selected_device_count" INTEGER NOT NULL,
  "success_count" INTEGER NOT NULL,
  "offline_count" INTEGER NOT NULL,
  "failed_rollback_count" INTEGER NOT NULL,
  "excluded_count" INTEGER NOT NULL,
  "audit_required" BOOLEAN NOT NULL,
  "scenario_id" VARCHAR(64) NOT NULL,
  CONSTRAINT "pk_firmware_campaigns" PRIMARY KEY ("campaign_id")
);

CREATE TABLE IF NOT EXISTS "firmware_execution" (
  "execution_id" VARCHAR(64) NOT NULL,
  "campaign_id" VARCHAR(64) NOT NULL,
  "device_id" VARCHAR(64) NOT NULL,
  "execution_datetime_utc" TIMESTAMPTZ NOT NULL,
  "outcome" TEXT NOT NULL,
  "resulting_firmware_version" VARCHAR(64),
  "result_detail" TEXT NOT NULL,
  "scenario_id" VARCHAR(64) NOT NULL,
  CONSTRAINT "pk_firmware_execution" PRIMARY KEY ("execution_id")
);

CREATE TABLE IF NOT EXISTS "audit_log" (
  "audit_id" VARCHAR(64) NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" VARCHAR(64) NOT NULL,
  "action" TEXT NOT NULL,
  "previous_value" TEXT NOT NULL,
  "new_value" TEXT NOT NULL,
  "event_datetime_utc" TIMESTAMPTZ NOT NULL,
  "performed_by" TEXT NOT NULL,
  "scenario_id" VARCHAR(64) NOT NULL,
  CONSTRAINT "pk_audit_log" PRIMARY KEY ("audit_id")
);

CREATE TABLE IF NOT EXISTS "ticket_status_history" (
  "ticket_status_event_id" VARCHAR(64) NOT NULL,
  "ticket_id" VARCHAR(64) NOT NULL,
  "status" TEXT NOT NULL,
  "status_datetime_utc" TIMESTAMPTZ NOT NULL,
  "changed_by_technician_id" VARCHAR(64) NOT NULL,
  "scenario_id" VARCHAR(64),
  CONSTRAINT "pk_ticket_status_history" PRIMARY KEY ("ticket_status_event_id")
);

CREATE TABLE IF NOT EXISTS "risk_register" (
  "risk_id" VARCHAR(64) NOT NULL,
  "patient_id" VARCHAR(64) NOT NULL,
  "hospital_id" VARCHAR(64) NOT NULL,
  "risk_type" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "identified_datetime_utc" TIMESTAMPTZ NOT NULL,
  "scenario_id" VARCHAR(64),
  CONSTRAINT "pk_risk_register" PRIMARY KEY ("risk_id")
);

ALTER TABLE "patients" ADD CONSTRAINT "fk_patients_hospital_id_1" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("hospital_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "patients" ADD CONSTRAINT "fk_patients_assigned_nurse_id_2" FOREIGN KEY ("assigned_nurse_id") REFERENCES "nurses"("nurse_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "nurses" ADD CONSTRAINT "fk_nurses_hospital_id_3" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("hospital_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "medical_devices" ADD CONSTRAINT "fk_medical_devices_hospital_id_4" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("hospital_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "logistics_shipments" ADD CONSTRAINT "fk_logistics_shipments_destination_hospital_id_5" FOREIGN KEY ("destination_hospital_id") REFERENCES "hospitals"("hospital_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "logistics_shipments" ADD CONSTRAINT "fk_logistics_shipments_hospital_id_6" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("hospital_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "logistics_shipments" ADD CONSTRAINT "fk_logistics_shipments_distribution_center_id_7" FOREIGN KEY ("distribution_center_id") REFERENCES "distribution_centers"("distribution_center_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "logistics_shipments" ADD CONSTRAINT "fk_logistics_shipments_supplier_id_8" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "resilience_alerts" ADD CONSTRAINT "fk_resilience_alerts_hospital_id_9" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("hospital_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "resilience_alerts" ADD CONSTRAINT "fk_resilience_alerts_related_shipment_id_10" FOREIGN KEY ("related_shipment_id") REFERENCES "logistics_shipments"("shipment_id") ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "therapy_episodes" ADD CONSTRAINT "fk_therapy_episodes_patient_id_11" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "therapy_sessions" ADD CONSTRAINT "fk_therapy_sessions_therapy_episode_id_12" FOREIGN KEY ("therapy_episode_id") REFERENCES "therapy_episodes"("therapy_episode_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "therapy_sessions" ADD CONSTRAINT "fk_therapy_sessions_patient_id_13" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "nurse_patient_assignment" ADD CONSTRAINT "fk_nurse_patient_assignment_nurse_id_14" FOREIGN KEY ("nurse_id") REFERENCES "nurses"("nurse_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "nurse_patient_assignment" ADD CONSTRAINT "fk_nurse_patient_assignment_patient_id_15" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "device_patient_assignment" ADD CONSTRAINT "fk_device_patient_assignment_device_id_16" FOREIGN KEY ("device_id") REFERENCES "medical_devices"("device_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "device_patient_assignment" ADD CONSTRAINT "fk_device_patient_assignment_patient_id_17" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "patient_supply_plan" ADD CONSTRAINT "fk_patient_supply_plan_patient_id_18" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "patient_supply_plan" ADD CONSTRAINT "fk_patient_supply_plan_therapy_episode_id_19" FOREIGN KEY ("therapy_episode_id") REFERENCES "therapy_episodes"("therapy_episode_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "inventory" ADD CONSTRAINT "fk_inventory_distribution_center_id_20" FOREIGN KEY ("distribution_center_id") REFERENCES "distribution_centers"("distribution_center_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "shipment_patient_allocation" ADD CONSTRAINT "fk_shipment_patient_allocation_shipment_id_21" FOREIGN KEY ("shipment_id") REFERENCES "logistics_shipments"("shipment_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "shipment_patient_allocation" ADD CONSTRAINT "fk_shipment_patient_allocation_patient_id_22" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "shipment_patient_allocation" ADD CONSTRAINT "fk_shipment_patient_allocation_hospital_id_23" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("hospital_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "shipment_events" ADD CONSTRAINT "fk_shipment_events_shipment_id_24" FOREIGN KEY ("shipment_id") REFERENCES "logistics_shipments"("shipment_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "device_alarms" ADD CONSTRAINT "fk_device_alarms_device_id_25" FOREIGN KEY ("device_id") REFERENCES "medical_devices"("device_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "service_tickets" ADD CONSTRAINT "fk_service_tickets_device_id_26" FOREIGN KEY ("device_id") REFERENCES "medical_devices"("device_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "service_tickets" ADD CONSTRAINT "fk_service_tickets_alarm_id_27" FOREIGN KEY ("alarm_id") REFERENCES "device_alarms"("alarm_id") ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "service_tickets" ADD CONSTRAINT "fk_service_tickets_assigned_technician_id_28" FOREIGN KEY ("assigned_technician_id") REFERENCES "technician_master"("technician_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "work_orders" ADD CONSTRAINT "fk_work_orders_ticket_id_29" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("ticket_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "work_orders" ADD CONSTRAINT "fk_work_orders_technician_id_30" FOREIGN KEY ("technician_id") REFERENCES "technician_master"("technician_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "recall_cases" ADD CONSTRAINT "fk_recall_cases_device_id_31" FOREIGN KEY ("device_id") REFERENCES "medical_devices"("device_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "firmware_execution" ADD CONSTRAINT "fk_firmware_execution_campaign_id_32" FOREIGN KEY ("campaign_id") REFERENCES "firmware_campaigns"("campaign_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "firmware_execution" ADD CONSTRAINT "fk_firmware_execution_device_id_33" FOREIGN KEY ("device_id") REFERENCES "medical_devices"("device_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "intervention_cases" ADD CONSTRAINT "fk_intervention_cases_patient_id_34" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "intervention_cases" ADD CONSTRAINT "fk_intervention_cases_therapy_episode_id_35" FOREIGN KEY ("therapy_episode_id") REFERENCES "therapy_episodes"("therapy_episode_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "intervention_cases" ADD CONSTRAINT "fk_intervention_cases_assigned_nurse_id_36" FOREIGN KEY ("assigned_nurse_id") REFERENCES "nurses"("nurse_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "risk_register" ADD CONSTRAINT "fk_risk_register_patient_id_37" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "risk_register" ADD CONSTRAINT "fk_risk_register_hospital_id_38" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("hospital_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "ticket_status_history" ADD CONSTRAINT "fk_ticket_status_history_ticket_id_39" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("ticket_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "device_alarms" ADD CONSTRAINT "fk_device_alarms_ticket_id_40" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("ticket_id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "inventory" ADD CONSTRAINT "ck_inventory_available_qty" CHECK ("available_qty" = "on_hand_qty" - "reserved_qty");

COMMIT;