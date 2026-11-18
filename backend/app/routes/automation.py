import asyncio
import json
import logging
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query
from psycopg.rows import dict_row

from app.database import get_db_pool

router = APIRouter(prefix="/api/automation", tags=["Automation"])
log = logging.getLogger("care_compass.automation")
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"


def _weather(lat, lon):
    params = urllib.parse.urlencode({
        "latitude": float(lat), "longitude": float(lon),
        "hourly": "precipitation_probability,wind_speed_10m,weather_code",
        "forecast_days": 2, "timezone": "UTC",
    })
    req = urllib.request.Request(f"{WEATHER_URL}?{params}", headers={"User-Agent": "CareCompass/1.0"})
    with urllib.request.urlopen(req, timeout=12) as response:
        data = json.loads(response.read().decode("utf-8"))
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    times = data.get("hourly", {}).get("time", [])
    candidates = []
    for i, stamp in enumerate(times):
        try:
            at = datetime.fromisoformat(stamp).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        if now <= at <= now + timedelta(hours=24):
            rain = (data["hourly"].get("precipitation_probability") or [None] * len(times))[i]
            wind = (data["hourly"].get("wind_speed_10m") or [None] * len(times))[i]
            code = (data["hourly"].get("weather_code") or [None] * len(times))[i]
            candidates.append({"at": at.isoformat(), "rain_probability": rain, "wind_kmh": wind, "weather_code": code})
    risky = [x for x in candidates if (x["rain_probability"] is not None and x["rain_probability"] >= 60) or (x["wind_kmh"] is not None and x["wind_kmh"] >= 45) or (x["weather_code"] is not None and x["weather_code"] >= 95)]
    return (risky[0] if risky else None), candidates[:6]


def _ensure_table(connection):
    connection.execute("""
        CREATE TABLE IF NOT EXISTS public.automation_events (
            event_id BIGSERIAL PRIMARY KEY,
            event_key TEXT NOT NULL UNIQUE,
            module TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            severity TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            recommended_action TEXT NOT NULL,
            event_status TEXT NOT NULL DEFAULT 'Open',
            details JSONB NOT NULL DEFAULT '{}'::jsonb,
            first_seen_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_seen_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            acknowledged_by TEXT,
            acknowledged_at_utc TIMESTAMPTZ
        )
    """)


def run_automation_scan():
    pool = get_db_pool()
    created = 0
    checked = {"shipments": 0, "home_visits": 0, "inventory_items": 0}
    errors = []
    with pool.connection() as conn:
        _ensure_table(conn)
        with conn.cursor(row_factory=dict_row) as cur:
            # Logistics: flag overdue active shipments and severe destination weather.
            cur.execute("""
                SELECT s.shipment_id, s.shipment_status, s.priority, s.estimated_delivery_utc,
                       s.destination_city, s.destination_state, s.destination_hospital_id,
                       h.latitude, h.longitude
                FROM public.logistics_shipments s
                LEFT JOIN public.hospitals h ON h.hospital_id = s.destination_hospital_id
                WHERE LOWER(COALESCE(s.shipment_status,'')) NOT IN ('delivered','cancelled','canceled','complete','completed')
                ORDER BY s.estimated_delivery_utc ASC LIMIT 500
            """)
            shipments = cur.fetchall()
            checked["shipments"] = len(shipments)
            now = datetime.now(timezone.utc)
            for s in shipments:
                eta = s.get("estimated_delivery_utc")
                if eta and eta.tzinfo is None:
                    eta = eta.replace(tzinfo=timezone.utc)
                if eta and eta < now:
                    _upsert_event(cur, {
                        "key": f"logistics:overdue:{s['shipment_id']}", "module": "Logistics",
                        "entity": s["shipment_id"], "severity": "High" if str(s.get("priority","")).lower() in ("critical","high") else "Moderate",
                        "title": f"Shipment {s['shipment_id']} is overdue",
                        "description": f"Shipment ETA passed at {eta.isoformat()} and its status is still {s.get('shipment_status')}.",
                        "action": "Contact the carrier, verify the shipment location and assess destination stock coverage.",
                        "details": {"eta": eta.isoformat(), "destination": f"{s.get('destination_city')}, {s.get('destination_state')}"},
                    })
                    created += 1
                if s.get("latitude") is not None and s.get("longitude") is not None:
                    try:
                        risk, forecast = _weather(s["latitude"], s["longitude"])
                        if risk:
                            _upsert_event(cur, {
                                "key": f"logistics:weather:{s['shipment_id']}:{risk['at'][:13]}", "module": "Logistics",
                                "entity": s["shipment_id"], "severity": "High" if (risk.get("weather_code") or 0) >= 95 or (risk.get("wind_kmh") or 0) >= 65 else "Moderate",
                                "title": f"Weather risk near destination for {s['shipment_id']}",
                                "description": f"Forecast risk at {risk['at']}: rain probability {risk.get('rain_probability')}%, wind {risk.get('wind_kmh')} km/h, weather code {risk.get('weather_code')}.",
                                "action": "Review route and delivery timing; contact the destination facility before changing the plan.",
                                "details": {"risk_hour": risk, "forecast_sample": forecast},
                            })
                            created += 1
                    except Exception as exc:
                        errors.append(f"Shipment weather {s['shipment_id']}: {str(exc)[:160]}")

            # Nurse: upcoming home visits, linked to patient location and assigned nurse.
            cur.execute("""
                SELECT ts.session_id, ts.patient_id, ts.scheduled_datetime_utc, ts.session_status,
                       p.city, p.state, p.assigned_nurse_id, p.hospital_id, h.latitude, h.longitude
                FROM public.therapy_sessions ts
                JOIN public.patients p ON p.patient_id = ts.patient_id
                LEFT JOIN public.hospitals h ON h.hospital_id = p.hospital_id
                WHERE LOWER(COALESCE(ts.delivery_mode,'')) LIKE '%home%'
                  AND LOWER(COALESCE(ts.session_status,'')) NOT IN ('completed','cancelled','canceled')
                  AND ts.scheduled_datetime_utc BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
                ORDER BY ts.scheduled_datetime_utc LIMIT 300
            """)
            visits = cur.fetchall()
            checked["home_visits"] = len(visits)
            for v in visits:
                try:
                    risk, forecast = _weather(v["latitude"], v["longitude"])
                    if risk:
                        _upsert_event(cur, {
                            "key": f"nurse:weather:{v['session_id']}:{risk['at'][:13]}", "module": "Nurse",
                            "entity": v["session_id"], "severity": "High" if (risk.get("weather_code") or 0) >= 95 or (risk.get("wind_kmh") or 0) >= 65 else "Moderate",
                            "title": f"Weather risk before home visit {v['session_id']}",
                            "description": f"Forecast risk at {risk['at']}: rain probability {risk.get('rain_probability')}%, wind {risk.get('wind_kmh')} km/h. Patient {v['patient_id']}; assigned nurse {v.get('assigned_nurse_id')}.",
                            "action": "Nurse should review travel conditions and contact the patient; reschedule only after clinical/dispatch approval.",
                            "details": {"patient_id": v["patient_id"], "nurse_id": v.get("assigned_nurse_id"), "scheduled_at": v["scheduled_datetime_utc"].isoformat(), "risk_hour": risk, "forecast_sample": forecast, "location_basis": "patient hospital coordinates (approximation)"},
                        })
                        created += 1
                except Exception as exc:
                    errors.append(f"Home visit weather {v['session_id']}: {str(exc)[:160]}")

            # Logistics: low available inventory alerts.
            cur.execute("""
                SELECT inventory_id, distribution_center_id, item_name, available_qty, reorder_threshold
                FROM public.inventory WHERE available_qty <= reorder_threshold
                ORDER BY available_qty ASC LIMIT 500
            """)
            stock = cur.fetchall()
            checked["inventory_items"] = len(stock)
            for item in stock:
                _upsert_event(cur, {
                    "key": f"logistics:stock:{item['inventory_id']}", "module": "Logistics",
                    "entity": item["inventory_id"], "severity": "High" if item["available_qty"] <= 0 else "Moderate",
                    "title": f"Low stock: {item['item_name']}",
                    "description": f"Distribution centre {item['distribution_center_id']} has {item['available_qty']} available against reorder threshold {item['reorder_threshold']}.",
                    "action": "Review replenishment options and confirm supply before rerouting shipments.",
                    "details": {"distribution_center_id": item["distribution_center_id"], "available_qty": item["available_qty"], "reorder_threshold": item["reorder_threshold"]},
                })
                created += 1
        conn.commit()
    return {"status": "completed", "checked": checked, "events_upserted": created, "errors": errors[:20], "checked_at_utc": datetime.now(timezone.utc).isoformat()}


def _upsert_event(cur, e):
    cur.execute("""
        INSERT INTO public.automation_events
          (event_key,module,entity_id,severity,title,description,recommended_action,details)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
        ON CONFLICT (event_key) DO UPDATE SET
          severity=EXCLUDED.severity, title=EXCLUDED.title,
          description=EXCLUDED.description, recommended_action=EXCLUDED.recommended_action,
          details=EXCLUDED.details, last_seen_utc=NOW()
    """, (e["key"],e["module"],e["entity"],e["severity"],e["title"],e["description"],e["action"],json.dumps(e["details"], default=str)))


@router.get("/events")
def list_events(module: str | None = Query(default=None), limit: int = Query(default=100, ge=1, le=500)):
    with get_db_pool().connection() as conn:
        _ensure_table(conn)
        with conn.cursor(row_factory=dict_row) as cur:
            if module:
                cur.execute("SELECT * FROM public.automation_events WHERE module=%s ORDER BY first_seen_utc DESC LIMIT %s", (module, limit))
            else:
                cur.execute("SELECT * FROM public.automation_events ORDER BY first_seen_utc DESC LIMIT %s", (limit,))
            rows = cur.fetchall()
        conn.commit()
    return {"rows": rows, "count": len(rows)}


@router.get("/status")
def automation_status():
    with get_db_pool().connection() as conn:
        _ensure_table(conn)
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE event_status='Open') AS open, MAX(last_seen_utc) AS last_run FROM public.automation_events")
            result = cur.fetchone()
        conn.commit()
    return {"enabled": True, "schedule_minutes": 15, **result}


@router.post("/run")
def run_now():
    try:
        return run_automation_scan()
    except Exception as exc:
        log.exception("Automation scan failed")
        raise HTTPException(status_code=500, detail=f"Automation scan failed: {str(exc)[:300]}")


@router.post("/events/{event_id}/acknowledge")
def acknowledge_event(event_id: int, actor: str = Query(default="Operations user", min_length=1, max_length=120)):
    with get_db_pool().connection() as conn:
        _ensure_table(conn)
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                UPDATE public.automation_events SET event_status='Acknowledged',
                  acknowledged_by=%s, acknowledged_at_utc=NOW()
                WHERE event_id=%s RETURNING event_id,event_status,acknowledged_by,acknowledged_at_utc
            """, (actor, event_id))
            row = cur.fetchone()
        conn.commit()
    if not row:
        raise HTTPException(status_code=404, detail="Automation event not found")
    return row


async def automation_scheduler():
    # Run once at startup, then every 15 minutes. External weather failures are isolated per item.
    await asyncio.sleep(8)
    while True:
        try:
            await asyncio.to_thread(run_automation_scan)
        except Exception:
            log.exception("Scheduled automation scan failed")
        await asyncio.sleep(15 * 60)
