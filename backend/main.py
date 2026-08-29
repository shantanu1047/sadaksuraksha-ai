"""
FastAPI Main Application Server for Multimodal Road Hazard AI Platform.
India Sector Deployment with Multi-State Filtering (Karnataka, Maharashtra, Delhi NCR, Tamil Nadu, Telangana).
All costs formatted in Indian Rupees (₹ INR).
"""

import os
import json
import asyncio
import logging
import uuid
import urllib.request
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from backend.models.schemas import (
    HazardIncident,
    RoadSegment,
    WorkOrder,
    HazardType,
    SeverityLevel,
    RoadClassification,
    MultimodalUploadRequest,
    CopilotQuery,
    CopilotResponse,
    PatrolTelemetryFrame,
    TelemetrySample,
    AcousticFeature,
    CitizenReport,
    EnvironmentalContext,
    CitizenSubmissionRequest,
    CitizenTicketResponse,
    CctvFrameIngestRequest,
    GoogleMapsAnomalyRequest,
    IngestionStreamStatus,
    RoadForecastItem,
    ForecastSummaryResponse,
)
from backend.services.ingestion_service import IngestionService
from backend.services.forecast_service import ForecastService
from backend.core.vision_engine import VisionEngine
from backend.core.sensor_fusion import SensorFusionEngine
from backend.core.prioritization_engine import PrioritizationEngine
from backend.services.copilot_service import CopilotService
from backend.data.demo_data import get_demo_hazards, get_demo_road_segments, generate_sample_telemetry_trace

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("RoadHazardAI")

app = FastAPI(
    title="SadakSuraksha AI // Multimodal Road Hazard AI & Maintenance Prioritization API",
    version="1.1.0",
    description="Multimodal platform for road distress detection and maintenance scheduling across Indian States (₹ INR).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

vision_engine = VisionEngine()
fusion_engine = SensorFusionEngine()
prioritization_engine = PrioritizationEngine()
copilot_service = CopilotService()
ingestion_service = IngestionService()
forecast_service = ForecastService()

def get_cloud_endpoint() -> Optional[str]:
    url = os.environ.get("CLOUD_DB_URL", "").strip()
    return url if url else None

def fetch_hazards_from_cloud() -> List[HazardIncident]:
    """Fetches real-time persisted citizen complaints from Cloud Database if configured."""
    endpoint = get_cloud_endpoint()
    if not endpoint:
        return []
    try:
        req = urllib.request.Request(
            endpoint,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "SadakSuraksha-Production/1.0",
            },
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=2) as res:
            if res.status == 200:
                raw = res.read().decode("utf-8")
                res_obj = json.loads(raw)
                data_block = res_obj.get("data", {}) if isinstance(res_obj, dict) else {}
                hazards_list = data_block.get("hazards", []) if isinstance(data_block, dict) else []
                if isinstance(hazards_list, list):
                    items = []
                    for d in hazards_list:
                        if isinstance(d, dict) and d.get("id"):
                            d.pop("_id", None)
                            try:
                                items.append(HazardIncident(**d))
                            except Exception:
                                pass
                    return items
    except Exception as e:
        logger.debug(f"Cloud DB fetch error: {e}")
    return []

def save_hazards_to_cloud(hazards: List[HazardIncident]) -> bool:
    """Saves citizen hazard list atomically to Cloud Database if configured."""
    endpoint = get_cloud_endpoint()
    if not endpoint:
        return False
    try:
        citizen_only = [inc.model_dump() for inc in hazards if inc.id.startswith("HAZ-")]
        payload = json.dumps({
            "name": "sadaksuraksha_hazards_store",
            "data": {"hazards": citizen_only[:100]}
        }, default=str).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "SadakSuraksha-Production/1.0",
            },
            method="PUT",
        )
        with urllib.request.urlopen(req, timeout=3) as res:
            return res.status in (200, 201)
    except Exception as e:
        logger.debug(f"Cloud DB save error: {e}")
        return False

def clear_cloud_hazards():
    """Wipes all hazard records from Cloud Database if configured."""
    endpoint = get_cloud_endpoint()
    if not endpoint:
        return
    try:
        payload = json.dumps({
            "name": "sadaksuraksha_hazards_store",
            "data": {"hazards": []}
        }).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "SadakSuraksha-Production/1.0",
            },
            method="PUT",
        )
        with urllib.request.urlopen(req, timeout=2) as res:
            pass
    except Exception as e:
        logger.debug(f"Cloud DB clear error: {e}")

def get_storage_paths() -> List[Path]:
    paths = []
    # Primary local database folder
    try:
        base = Path(__file__).resolve().parent.parent / "database"
        base.mkdir(parents=True, exist_ok=True)
        paths.append(base / "persisted_citizen_hazards.json")
    except Exception:
        pass

    # Root workspace folder
    try:
        paths.append(Path.cwd() / "database" / "persisted_citizen_hazards.json")
    except Exception:
        pass

    # Serverless / Lambda / Vercel writable /tmp location
    try:
        paths.append(Path("/tmp") / "persisted_citizen_hazards.json")
    except Exception:
        pass

    return paths


def load_persisted_citizen_hazards() -> List[HazardIncident]:
    loaded_map: Dict[str, HazardIncident] = {}
    
    # 1. Cloud Database (Primary source of truth across serverless workers)
    for ch in fetch_hazards_from_cloud():
        loaded_map[ch.id] = ch

    # 2. Local Disk Stores (Secondary fallback)
    for p in get_storage_paths():
        try:
            if p.exists():
                with open(p, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content:
                        data = json.loads(content)
                        if isinstance(data, list):
                            for d in data:
                                if isinstance(d, dict) and d.get("id"):
                                    try:
                                        if d["id"] not in loaded_map:
                                            loaded_map[d["id"]] = HazardIncident(**d)
                                    except Exception:
                                        pass
        except Exception as e:
            logger.debug(f"Could not load persisted hazards from {p}: {e}")
            
    return list(loaded_map.values())


demo_hazards_cache: List[HazardIncident] = get_demo_hazards()
DEMO_HAZARD_IDS = {h.id for h in demo_hazards_cache}
roads_db: List[RoadSegment] = get_demo_road_segments()

def save_persisted_citizen_hazards(incidents: List[HazardIncident]):
    """Persist only genuine citizen / live ingested reports (excluding baseline demo hazards)."""
    citizen_only = [inc.model_dump() for inc in incidents if inc.id not in DEMO_HAZARD_IDS]
    citizen_only = citizen_only[:200]
    payload_str = json.dumps(citizen_only, indent=2, default=str)
    
    # 1. Save to local disk paths
    for p in get_storage_paths():
        try:
            p.parent.mkdir(parents=True, exist_ok=True)
            with open(p, "w", encoding="utf-8") as f:
                f.write(payload_str)
        except Exception as e:
            logger.debug(f"Could not persist hazard to {p}: {e}")

    # 2. Save atomically to Cloud Database
    save_hazards_to_cloud([inc for inc in incidents if inc.id not in DEMO_HAZARD_IDS])


def sync_hazards_from_disk():
    """Ensures in-memory hazards_db and work_orders_db are synchronized with both baseline 16-state hazards and persistent storage."""
    global hazards_db, work_orders_db
    persisted = load_persisted_citizen_hazards()
    
    # Combined dictionary: baseline demo hazards + persisted citizen hazards (citizen reports appear first)
    combined_map: Dict[str, HazardIncident] = {}
    for p in persisted:
        if p.id not in DEMO_HAZARD_IDS:
            combined_map[p.id] = p
    for h in demo_hazards_cache:
        if h.id not in combined_map:
            combined_map[h.id] = h
        
    hazards_db[:] = list(combined_map.values())
    work_orders_db = prioritization_engine.cluster_and_generate_work_orders(hazards_db)


hazards_db: List[HazardIncident] = []
sync_hazards_from_disk()


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "SadakSuraksha-AI",
        "region": "All India (Multi-State)",
        "currency": "INR (₹)",
        "gemini_api_configured": bool(os.environ.get("GEMINI_API_KEY")),
        "active_incidents": len(hazards_db),
        "active_work_orders": len(work_orders_db),
    }


@app.get("/api/config/apikey")
async def get_api_key_status():
    """Check if Gemini API Key is currently active on the server."""
    key = os.environ.get("GEMINI_API_KEY", "")
    masked = f"{key[:4]}...{key[-4:]}" if len(key) > 8 else ("Configured" if key else "")
    return {
        "configured": bool(key),
        "masked_key": masked,
        "model": "gemini-2.5-flash" if key else "onboard-heuristic-cv"
    }


@app.post("/api/config/apikey")
async def set_api_key(payload: Dict[str, Any]):
    """Hot-swap Gemini API Key dynamically on the live server."""
    global vision_engine, copilot_service
    key = str(payload.get("api_key", "")).strip()
    if key:
        os.environ["GEMINI_API_KEY"] = key
        vision_engine = VisionEngine(api_key=key)
        copilot_service = CopilotService(api_key=key)
        return {
            "status": "success",
            "message": "Google Gemini 2.5 Flash API Key connected and active.",
            "configured": True,
            "model": "gemini-2.5-flash"
        }
    else:
        os.environ.pop("GEMINI_API_KEY", None)
        vision_engine = VisionEngine()
        copilot_service = CopilotService()
        return {
            "status": "success",
            "message": "Reverted to Onboard Local Computer Vision Engine.",
            "configured": False,
            "model": "onboard-heuristic-cv"
        }


@app.post("/api/hazards/reset")
@app.delete("/api/hazards/citizen")
async def reset_citizen_hazards():
    """Clear all persisted citizen complaints and reset database back to the clean baseline demo state."""
    global hazards_db, work_orders_db
    clear_cloud_hazards()
    for p in get_storage_paths():
        try:
            if p.exists() or p.parent.exists():
                p.parent.mkdir(parents=True, exist_ok=True)
                with open(p, "w", encoding="utf-8") as f:
                    f.write("[]")
        except Exception as e:
            logger.debug(f"Reset write error on {p}: {e}")
    
    # Clear ingestion caches (citizen tickets, streams)
    ingestion_service.reset()

    # Re-sync with pristine demo dataset
    hazards_db[:] = [h.model_copy(deep=True) for h in demo_hazards_cache]
    work_orders_db = prioritization_engine.cluster_and_generate_work_orders(hazards_db)
    
    return {
        "status": "success",
        "message": "Database reset: all citizen complaints cleared and restored to clean baseline state.",
        "active_incidents": len(hazards_db),
        "active_work_orders": len(work_orders_db)
    }


@app.post("/api/hazards/seed-demo")
async def seed_demo_hazards():
    """Optionally re-populate benchmark demo hazards across 16 states."""
    global hazards_db, work_orders_db
    sync_hazards_from_disk()
    return {
        "status": "success",
        "message": f"Populated {len(hazards_db)} demo road hazards.",
        "active_incidents": len(hazards_db),
        "active_work_orders": len(work_orders_db)
    }


@app.get("/api/states")
async def list_states():
    """Returns available Indian States with regional incident statistics."""
    sync_hazards_from_disk()
    states_dict = {}
    for h in hazards_db:
        st = h.state
        if st not in states_dict:
            states_dict[st] = {
                "state": st,
                "city": h.city,
                "incident_count": 0,
                "critical_count": 0,
                "total_repair_cost_inr": 0.0,
            }
        states_dict[st]["incident_count"] += 1
        if h.severity == SeverityLevel.CRITICAL and not h.fusion.is_false_positive:
            states_dict[st]["critical_count"] += 1
        if not h.fusion.is_false_positive:
            states_dict[st]["total_repair_cost_inr"] += h.priority.estimated_repair_cost_usd

    return list(states_dict.values())


@app.get("/api/hazards", response_model=List[HazardIncident])
async def list_hazards(
    state: Optional[str] = None,
    city: Optional[str] = None,
    hazard_type: Optional[HazardType] = None,
    severity: Optional[SeverityLevel] = None,
    road_class: Optional[RoadClassification] = None,
    min_risk: Optional[float] = None,
    exclude_false_positives: bool = False,
):
    sync_hazards_from_disk()
    results = hazards_db
    if state and state.strip().lower() not in ("all", "all india"):
        results = [h for h in results if (h.state and h.state.strip().lower() == state.strip().lower())]
    if city and city.strip().lower() not in ("all", "all cities"):
        results = [h for h in results if (h.city and h.city.strip().lower() == city.strip().lower())]
    if hazard_type:
        results = [h for h in results if h.hazard_type == hazard_type]
    if severity:
        results = [h for h in results if h.severity == severity]
    if road_class:
        results = [h for h in results if h.road_class == road_class]
    if min_risk is not None:
        results = [h for h in results if h.priority.raw_risk_score >= min_risk]
    if exclude_false_positives:
        results = [h for h in results if not h.fusion.is_false_positive]
    return results


@app.get("/api/hazards/{hazard_id}", response_model=HazardIncident)
async def get_hazard_detail(hazard_id: str):
    for h in hazards_db:
        if h.id.upper() == hazard_id.upper():
            return h
    raise HTTPException(status_code=404, detail=f"Hazard incident '{hazard_id}' not found.")


@app.post("/api/hazards/inspect", response_model=HazardIncident)
async def inspect_multimodal(payload: MultimodalUploadRequest):
    detections = vision_engine.analyze_image(
        image_b64=payload.image_base64,
        image_url=payload.image_url,
        latitude=payload.latitude,
        longitude=payload.longitude,
        speed_kmh=payload.speed_kmh,
    )
    primary_det = detections[0] if detections else None

    telemetry = TelemetrySample(
        timestamp="2026-08-25 13:00:00",
        latitude=payload.latitude,
        longitude=payload.longitude,
        speed_kmh=payload.speed_kmh,
        acc_x_g=0.08,
        acc_y_g=0.12,
        acc_z_g=payload.acc_z_g,
        vertical_jerk_g_s=payload.vertical_jerk,
        iri_roughness_m_km=round(abs(payload.acc_z_g - 1.0) * 3.5 + 2.0, 1),
    )

    acoustic = AcousticFeature(
        timestamp="2026-08-25 13:00:00",
        dominant_freq_hz=950.0 if payload.acc_z_g > 1.4 else 320.0,
        impact_energy_db=payload.acoustic_db,
        acoustic_anomaly_score=min(1.0, max(0.0, (payload.acoustic_db - 35.0) / 45.0)),
        signature_type="dry_impact" if payload.acc_z_g > 1.5 else "smooth",
    )

    citizen = None
    if payload.citizen_text and payload.citizen_text.strip():
        citizen = CitizenReport(
            report_id=f"CITIZEN-LIVE-{len(hazards_db)+1:03d}",
            timestamp="2026-08-25 13:00:00",
            text_content=payload.citizen_text.strip(),
            reporter_urgency=4 if payload.acc_z_g > 1.8 else 3,
            citizen_category="Live Field Inspection",
        )

    env = EnvironmentalContext(
        temperature_c=28.0,
        precipitation_mm=10.0,
        freeze_thaw_cycles_24h=0,
        aadt_traffic_volume=65000,
        is_emergency_route=(payload.road_class == RoadClassification.HOSPITAL_CORRIDOR),
        is_public_transit_corridor=(payload.road_class == RoadClassification.ARTERIAL),
    )

    fusion = fusion_engine.fuse(
        visual=primary_det,
        telemetry=telemetry,
        acoustic=acoustic,
        citizen_report=citizen,
        env_context=env,
    )

    if fusion.fused_confidence > 0.85 and (fusion.physical_depth_cm > 6.0 or payload.road_class == RoadClassification.HOSPITAL_CORRIDOR):
        sev = SeverityLevel.CRITICAL
    elif fusion.fused_confidence > 0.70 or fusion.physical_depth_cm > 4.0:
        sev = SeverityLevel.HIGH
    elif fusion.fused_confidence > 0.40:
        sev = SeverityLevel.MEDIUM
    else:
        sev = SeverityLevel.LOW

    ht = primary_det.hazard_type if primary_det else HazardType.POTHOLE

    priority = prioritization_engine.calculate_priority_metrics(
        hazard_type=ht,
        severity=sev,
        fusion=fusion,
        road_class=payload.road_class,
        env_context=env,
    )

    new_id = f"HAZ-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    road_title = payload.road_name or f"{payload.road_class.value.replace('_', ' ').title()} Corridor"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    trace = generate_sample_telemetry_trace(acc_z_peak=payload.acc_z_g, is_bump=(payload.acc_z_g > 1.3))

    incident = HazardIncident(
        id=new_id,
        title=f"Detected {ht.value.replace('_', ' ').title()} ({sev.value.title()})",
        hazard_type=ht,
        severity=sev,
        state=payload.state,
        city=payload.city,
        road_id="ROAD-IN-LIVE",
        road_name=road_title,
        road_class=payload.road_class,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=f"Geotag: {payload.latitude:.4f}°N, {payload.longitude:.4f}°E ({road_title}, {payload.city}, {payload.state})",
        detected_at=now_str,
        visual_detections=[primary_det] if primary_det else [],
        telemetry=telemetry,
        acoustic=acoustic,
        citizen_report=citizen,
        env_context=env,
        fusion=fusion,
        priority=priority,
        status="Active",
        telemetry_trace=trace,
    )

    hazards_db.insert(0, incident)
    save_persisted_citizen_hazards(hazards_db)
    global work_orders_db
    work_orders_db = prioritization_engine.cluster_and_generate_work_orders(hazards_db)

    return incident


@app.get("/api/roads", response_model=List[RoadSegment])
async def list_roads(state: Optional[str] = None):
    if state and state.lower() != "all":
        return [r for r in roads_db if r.state.lower() == state.lower()]
    return roads_db


@app.get("/api/work-orders", response_model=List[WorkOrder])
async def list_work_orders(state: Optional[str] = None):
    sync_hazards_from_disk()
    if state and state.lower() != "all":
        return [wo for wo in work_orders_db if wo.state.lower() == state.lower()]
    return work_orders_db


@app.post("/api/work-orders/generate", response_model=List[WorkOrder])
async def regenerate_work_orders():
    sync_hazards_from_disk()
    global work_orders_db
    work_orders_db = prioritization_engine.cluster_and_generate_work_orders(hazards_db)
    return work_orders_db


@app.post("/api/work-orders/{order_id}/status")
async def update_work_order_status(order_id: str, status: str = Form(...)):
    for wo in work_orders_db:
        if wo.id.upper() == order_id.upper():
            wo.status = status
            return {"success": True, "order_id": order_id, "new_status": status}
    raise HTTPException(status_code=404, detail="Work order not found")


@app.post("/api/copilot/chat", response_model=CopilotResponse)
async def copilot_chat(query: CopilotQuery):
    sync_hazards_from_disk()
    active_hazards = hazards_db
    if query.state_filter and query.state_filter.strip().lower() not in ("all", "all india"):
        active_hazards = [h for h in hazards_db if (h.state and h.state.strip().lower() == query.state_filter.strip().lower())]
    return copilot_service.query(query, active_hazards, work_orders_db)


@app.get("/api/analytics/summary")
async def get_analytics_summary(state: Optional[str] = None):
    sync_hazards_from_disk()
    subset_hazards = hazards_db
    subset_roads = roads_db
    subset_work_orders = work_orders_db

    if state and state.strip().lower() not in ("all", "all india"):
        subset_hazards = [h for h in hazards_db if (h.state and h.state.strip().lower() == state.strip().lower())]
        subset_roads = [r for r in roads_db if (r.state and r.state.strip().lower() == state.strip().lower())]
        subset_work_orders = [wo for wo in work_orders_db if (wo.state and wo.state.strip().lower() == state.strip().lower())]

    actionable = [h for h in subset_hazards if not h.fusion.is_false_positive]
    false_positives = [h for h in subset_hazards if h.fusion.is_false_positive]
    critical_count = sum(1 for h in actionable if (h.severity == SeverityLevel.CRITICAL or str(getattr(h.severity, 'value', h.severity)).lower() == 'critical'))
    high_count = sum(1 for h in actionable if (h.severity == SeverityLevel.HIGH or str(getattr(h.severity, 'value', h.severity)).lower() == 'high'))
    med_count = sum(1 for h in actionable if (h.severity == SeverityLevel.MEDIUM or str(getattr(h.severity, 'value', h.severity)).lower() == 'medium'))
    low_count = sum(1 for h in actionable if (h.severity == SeverityLevel.LOW or str(getattr(h.severity, 'value', h.severity)).lower() == 'low'))

    total_cost_inr = sum(h.priority.estimated_repair_cost_usd for h in actionable)
    avg_pci = (sum(r.current_pci for r in subset_roads) / max(1, len(subset_roads))) if subset_roads else 65.0

    hazard_dist: Dict[str, int] = {}
    for h in actionable:
        k = h.hazard_type.value if hasattr(h.hazard_type, 'value') else str(h.hazard_type)
        hazard_dist[k] = hazard_dist.get(k, 0) + 1

    return {
        "currency": "INR",
        "currency_symbol": "₹",
        "selected_state": state or "All India",
        "total_active_hazards": len(actionable),
        "critical_hazards": critical_count,
        "high_hazards": high_count,
        "medium_hazards": med_count,
        "low_hazards": low_count,
        "false_positives_filtered": len(false_positives),
        "total_estimated_repair_cost_usd": round(total_cost_inr, 2),
        "average_network_pci": round(avg_pci, 1),
        "active_work_orders_count": len(subset_work_orders),
        "hazard_type_distribution": hazard_dist,
    }


# ==========================================
# MULTI-SOURCE INGESTION ENDPOINTS
# ==========================================

@app.post("/api/ingest/citizen-report", response_model=CitizenTicketResponse)
async def ingest_citizen_report(req: CitizenSubmissionRequest):
    """Public endpoint for citizen mobile portal submissions."""
    incident, ticket = ingestion_service.process_citizen_report(req, hazards_db)
    hazards_db.insert(0, incident)
    save_persisted_citizen_hazards(hazards_db)
    global work_orders_db
    work_orders_db = prioritization_engine.cluster_and_generate_work_orders(hazards_db)
    return ticket


@app.get("/api/ingest/citizen-report/{ticket_id}", response_model=CitizenTicketResponse)
async def get_citizen_ticket_status(ticket_id: str):
    """Public endpoint for citizens to track their report status."""
    sync_hazards_from_disk()
    ticket = ingestion_service.get_ticket_status(ticket_id, hazards_db)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found.")
    return ticket


@app.post("/api/ingest/cctv-feed")
async def ingest_cctv_frame(req: CctvFrameIngestRequest):
    """Webhook for Smart City / NHAI CCTV camera frame ingestion."""
    incident = ingestion_service.process_cctv_frame(req, hazards_db)
    if incident:
        hazards_db.insert(0, incident)
        global work_orders_db
        work_orders_db = prioritization_engine.cluster_and_generate_work_orders(hazards_db)
        return {"status": "hazard_detected", "hazard_id": incident.id, "severity": incident.severity.value}
    return {"status": "no_hazard_detected", "message": "Frame processed, no actionable defect found."}


@app.post("/api/ingest/google-maps-traffic")
async def ingest_google_maps_anomaly(req: GoogleMapsAnomalyRequest):
    """Webhook for Google Maps / telematics traffic anomaly data."""
    incident = ingestion_service.process_google_maps_anomaly(req, hazards_db)
    if incident:
        hazards_db.insert(0, incident)
        global work_orders_db
        work_orders_db = prioritization_engine.cluster_and_generate_work_orders(hazards_db)
        return {"status": "hazard_correlated", "hazard_id": incident.id, "severity": incident.severity.value}
    return {"status": "traffic_only", "message": "Speed anomaly not correlated with road surface damage."}


@app.get("/api/ingest/streams", response_model=List[IngestionStreamStatus])
async def list_ingestion_streams():
    """Returns status of all active ingestion feeds."""
    return ingestion_service.get_stream_statuses()


# ==========================================
# AI ROAD FORECAST ENDPOINTS
# ==========================================

@app.get("/api/forecast/roads", response_model=List[RoadForecastItem])
async def get_road_forecasts(state: Optional[str] = None, risk: Optional[str] = None):
    """Retrieve 7-day predictive failure risk forecasts across road corridors."""
    return forecast_service.list_forecasts(state=state, risk=risk)


@app.post("/api/forecast/run", response_model=List[RoadForecastItem])
async def run_road_forecast():
    """Run AI machine learning deterioration simulation model."""
    return forecast_service.run_simulation()


@app.get("/api/forecast/summary", response_model=ForecastSummaryResponse)
async def get_forecast_summary(state: Optional[str] = None):
    """Returns aggregated high-risk corridor metrics and cost prevention savings."""
    return forecast_service.get_summary(state=state)



# WebSocket Live Patrol Vehicle Simulation
@app.websocket("/ws/patrol-simulation")
async def websocket_patrol_simulation(websocket: WebSocket):
    await websocket.accept()
    logger.info("Patrol simulation client connected (Multi-State India).")

    waypoints = [
        {"lat": 12.9340, "lng": 77.6080, "road": "Hosur Road Medical Corridor", "state": "Karnataka", "city": "Bengaluru", "speed": 42.0, "bump": True, "hazard_id": "HAZ-001"},
        {"lat": 12.9360, "lng": 77.6910, "road": "Outer Ring Road IT Corridor", "state": "Karnataka", "city": "Bengaluru", "speed": 45.0, "bump": True, "hazard_id": "HAZ-006"},
        {"lat": 13.0350, "lng": 77.5970, "road": "NH-44 Airport Expressway", "state": "Karnataka", "city": "Bengaluru", "speed": 75.0, "bump": True, "hazard_id": "HAZ-002"},
        {"lat": 19.1136, "lng": 72.8697, "road": "Western Express Highway", "state": "Maharashtra", "city": "Mumbai", "speed": 55.0, "bump": True, "hazard_id": "HAZ-011"},
        {"lat": 18.7500, "lng": 73.3700, "road": "Mumbai-Pune Expressway", "state": "Maharashtra", "city": "Pune", "speed": 80.0, "bump": True, "hazard_id": "HAZ-012"},
        {"lat": 28.5672, "lng": 77.2100, "road": "Ring Road AIIMS Emergency Corridor", "state": "Delhi NCR", "city": "New Delhi", "speed": 48.0, "bump": True, "hazard_id": "HAZ-014"},
        {"lat": 28.4900, "lng": 77.0850, "road": "Delhi-Gurugram Expressway NH-48", "state": "Delhi NCR", "city": "Gurugram", "speed": 70.0, "bump": True, "hazard_id": "HAZ-015"},
        {"lat": 12.9850, "lng": 80.2450, "road": "Rajiv Gandhi Salai OMR IT Expressway", "state": "Tamil Nadu", "city": "Chennai", "speed": 52.0, "bump": True, "hazard_id": "HAZ-017"},
        {"lat": 17.4500, "lng": 78.3800, "road": "HITEC City Cyber Towers Corridor", "state": "Telangana", "city": "Hyderabad", "speed": 38.0, "bump": True, "hazard_id": "HAZ-020"},
        {"lat": 27.5200, "lng": 77.6600, "road": "Yamuna Expressway", "state": "Uttar Pradesh", "city": "Agra", "speed": 90.0, "bump": True, "hazard_id": "HAZ-021"},
        {"lat": 22.5120, "lng": 88.3990, "road": "EM Bypass Medical Corridor", "state": "West Bengal", "city": "Kolkata", "speed": 46.0, "bump": True, "hazard_id": "HAZ-023"},
        {"lat": 23.0300, "lng": 72.5080, "road": "Sarkhej-Gandhinagar (SG) Highway", "state": "Gujarat", "city": "Ahmedabad", "speed": 60.0, "bump": True, "hazard_id": "HAZ-025"},
        {"lat": 26.8920, "lng": 75.8150, "road": "Tonk Road SMS Hospital Corridor", "state": "Rajasthan", "city": "Jaipur", "speed": 40.0, "bump": True, "hazard_id": "HAZ-027"},
        {"lat": 9.9680, "lng": 76.3200, "road": "NH-66 Edappally-Vyttila Corridor", "state": "Kerala", "city": "Kochi", "speed": 44.0, "bump": True, "hazard_id": "HAZ-029"},
        {"lat": 30.7650, "lng": 76.7780, "road": "Madhya Marg PGIMER Trauma Corridor", "state": "Punjab & Haryana", "city": "Chandigarh", "speed": 50.0, "bump": True, "hazard_id": "HAZ-031"},
    ]

    try:
        step = 0
        while True:
            wp = waypoints[step % len(waypoints)]
            
            if wp["bump"]:
                acc_z = 2.65 + (step % 3) * 0.15
                jerk = 13.5
                db = 76.0
                iri = 7.5
            else:
                acc_z = 1.0 + 0.04 * ((step % 3) - 1)
                jerk = 0.5
                db = 41.0
                iri = 2.1

            detected_h = None
            if wp["hazard_id"]:
                for h in hazards_db:
                    if h.id == wp["hazard_id"]:
                        detected_h = h
                        break

            frame = PatrolTelemetryFrame(
                step_id=step,
                timestamp="2026-08-25 13:10:00",
                latitude=wp["lat"],
                longitude=wp["lng"],
                speed_kmh=wp["speed"],
                acc_x=0.03 * ((step % 2) - 0.5),
                acc_y=0.02 * ((step % 4) - 1.5),
                acc_z=round(acc_z, 3),
                vertical_jerk=round(jerk, 2),
                iri_roughness=round(iri, 2),
                acoustic_db=round(db, 1),
                hazard_detected=detected_h,
                active_road_name=wp["road"],
                state=wp["state"],
                city=wp["city"],
            )

            await websocket.send_text(frame.model_dump_json())
            step += 1
            await asyncio.sleep(1.8)

    except WebSocketDisconnect:
        logger.info("Patrol simulation client disconnected.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")


def get_frontend_dir() -> Path:
    candidates = [
        Path(__file__).resolve().parent.parent / "frontend",
        Path(os.getcwd()) / "frontend",
        Path("/var/task/frontend"),
        Path("./frontend"),
    ]
    for c in candidates:
        if c.exists() and (c / "index.html").exists():
            return c
    return candidates[0]

frontend_dir = get_frontend_dir()

if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")
    if (frontend_dir / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(frontend_dir / "assets")), name="assets")
    if (frontend_dir / "css").exists():
        app.mount("/css", StaticFiles(directory=str(frontend_dir / "css")), name="css")
    if (frontend_dir / "js").exists():
        app.mount("/js", StaticFiles(directory=str(frontend_dir / "js")), name="js")

@app.get("/")
async def serve_gateway():
    """National Gateway & Role Selection Screen."""
    fdir = get_frontend_dir()
    file_path = fdir / "login.html"
    if file_path.exists():
        return FileResponse(str(file_path))
    return JSONResponse({"status": "active", "message": "SadakSuraksha AI API operational", "frontend_path": str(fdir)})

@app.get("/login")
async def serve_login():
    """Login and role gateway."""
    fdir = get_frontend_dir()
    file_path = fdir / "login.html"
    if file_path.exists():
        return FileResponse(str(file_path))
    return FileResponse(str(fdir / "index.html"))

@app.get("/dashboard")
async def serve_dashboard():
    """Government Official AI Command Center."""
    fdir = get_frontend_dir()
    file_path = fdir / "index.html"
    if file_path.exists():
        return FileResponse(str(file_path))
    return JSONResponse({"status": "error", "message": f"Dashboard not found at {file_path}"})

@app.get("/admin")
async def serve_admin():
    """Government Official AI Command Center alias."""
    fdir = get_frontend_dir()
    return FileResponse(str(fdir / "index.html"))

@app.get("/report")
async def serve_citizen_report():
    """Indian Citizen Mobile Reporting Portal."""
    fdir = get_frontend_dir()
    file_path = fdir / "report.html"
    if file_path.exists():
        return FileResponse(str(file_path))
    return FileResponse(str(fdir / "index.html"))


