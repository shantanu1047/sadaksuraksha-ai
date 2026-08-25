"""
Pydantic schemas and domain models for Multimodal Road Hazard Detection
and Infrastructure Maintenance Prioritization in India (₹ INR).
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class HazardType(str, Enum):
    POTHOLE = "pothole"
    ALLIGATOR_CRACK = "alligator_crack"
    LONGITUDINAL_CRACK = "longitudinal_crack"
    RUTTING = "rutting"
    DAMAGED_GUARDRAIL = "damaged_guardrail"
    OBSCURED_SIGN = "obscured_sign"
    STANDING_WATER = "standing_water"
    DEBRIS = "debris"


class SeverityLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RoadClassification(str, Enum):
    INTERSTATE = "interstate"             # National Highway / Expressway
    ARTERIAL = "arterial"                 # Major Ring Road / Arterial
    COLLECTOR = "collector"               # Zonal connecting road
    RESIDENTIAL = "residential"           # Colony / Layout road
    SCHOOL_ZONE = "school_zone"           # School & Institutional zone
    HOSPITAL_CORRIDOR = "hospital_corridor" # Hospital emergency route


class WorkOrderStatus(str, Enum):
    PENDING_REVIEW = "pending_review"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DEFERRED = "deferred"


class BoundingBox(BaseModel):
    xmin: float = Field(..., description="Normalized xmin [0, 1]")
    ymin: float = Field(..., description="Normalized ymin [0, 1]")
    xmax: float = Field(..., description="Normalized xmax [0, 1]")
    ymax: float = Field(..., description="Normalized ymax [0, 1]")
    label: str
    confidence: float


class VisualDetection(BaseModel):
    hazard_type: HazardType
    confidence: float
    bbox: BoundingBox
    segmentation_polygon: Optional[List[List[float]]] = None
    estimated_area_sqm: float = 0.0
    estimated_depth_cm: float = 0.0


class TelemetrySample(BaseModel):
    timestamp: str
    latitude: float
    longitude: float
    speed_kmh: float
    acc_x_g: float
    acc_y_g: float
    acc_z_g: float
    vertical_jerk_g_s: float
    iri_roughness_m_km: float


class AcousticFeature(BaseModel):
    timestamp: str
    dominant_freq_hz: float
    impact_energy_db: float
    acoustic_anomaly_score: float
    signature_type: str = "dry_impact"


class CitizenReport(BaseModel):
    report_id: str
    timestamp: str
    text_content: str
    reporter_urgency: int = 3
    source: str = "BBMP_Sahaya_311"
    citizen_category: str = "Pothole / Road Damage"


class EnvironmentalContext(BaseModel):
    temperature_c: float
    precipitation_mm: float
    freeze_thaw_cycles_24h: int = 0
    aadt_traffic_volume: int
    is_emergency_route: bool = False
    is_public_transit_corridor: bool = False


class CrossModalFusionResult(BaseModel):
    visual_score: float
    inertial_score: float
    acoustic_score: float
    text_score: float
    fused_confidence: float
    is_false_positive: bool
    false_positive_reason: Optional[str] = None
    physical_depth_cm: float
    physical_area_sqm: float
    confidence_breakdown: Dict[str, float] = Field(default_factory=dict)


class PriorityMetrics(BaseModel):
    raw_risk_score: float
    pci_deduct_value: float
    pavement_vulnerability_index: float
    safety_urgency_multiplier: float
    traffic_impact_factor: float
    environmental_acceleration_factor: float
    final_priority_rank: int = 1
    estimated_repair_cost_usd: float = Field(..., description="Estimated repair cost in ₹ INR")
    recommended_repair_technique: str
    estimated_crew_hours: float


class HazardIncident(BaseModel):
    id: str
    title: str
    hazard_type: HazardType
    severity: SeverityLevel
    state: str = "Karnataka"
    city: str = "Bengaluru"
    road_id: str
    road_name: str
    road_class: RoadClassification
    latitude: float
    longitude: float
    address: str
    detected_at: str
    visual_detections: List[VisualDetection] = Field(default_factory=list)
    telemetry: Optional[TelemetrySample] = None
    acoustic: Optional[AcousticFeature] = None
    citizen_report: Optional[CitizenReport] = None
    env_context: Optional[EnvironmentalContext] = None
    fusion: CrossModalFusionResult
    priority: PriorityMetrics
    status: str = "Active"
    image_url: Optional[str] = None
    telemetry_trace: Optional[List[Dict[str, Any]]] = None


class RoadSegment(BaseModel):
    id: str
    name: str
    state: str = "Karnataka"
    city: str = "Bengaluru"
    road_class: RoadClassification
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    aadt_traffic: int
    current_pci: float
    hazard_count: int
    last_resurfaced: str
    length_km: float


class WorkOrder(BaseModel):
    id: str
    title: str
    state: str = "Karnataka"
    city: str = "Bengaluru"
    target_hazard_ids: List[str]
    assigned_crew: str
    scheduled_date: str
    estimated_hours: float
    estimated_cost_usd: float = Field(..., description="Total cost in ₹ INR")
    priority_tier: str
    status: WorkOrderStatus
    repair_materials: List[str]
    road_closure_needed: bool
    cluster_center_lat: float
    cluster_center_lng: float
    hazards_summary: List[Dict[str, Any]] = Field(default_factory=list)


class PatrolTelemetryFrame(BaseModel):
    step_id: int
    timestamp: str
    latitude: float
    longitude: float
    speed_kmh: float
    acc_x: float
    acc_y: float
    acc_z: float
    vertical_jerk: float
    iri_roughness: float
    acoustic_db: float
    hazard_detected: Optional[HazardIncident] = None
    active_road_name: str
    state: str = "Karnataka"
    city: str = "Bengaluru"


class CopilotQuery(BaseModel):
    prompt: str
    state_filter: Optional[str] = None
    context_hazard_ids: Optional[List[str]] = None
    api_key: Optional[str] = None


class CopilotResponse(BaseModel):
    answer: str
    referenced_hazards: List[str] = Field(default_factory=list)
    suggested_actions: List[str] = Field(default_factory=list)
    generated_work_order: Optional[Dict[str, Any]] = None


class MultimodalUploadRequest(BaseModel):
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    latitude: float
    longitude: float
    state: str = "Karnataka"
    city: str = "Bengaluru"
    speed_kmh: float = 40.0
    acc_z_g: float = 1.0
    vertical_jerk: float = 0.5
    acoustic_db: float = 42.0
    citizen_text: Optional[str] = None
    road_class: RoadClassification = RoadClassification.ARTERIAL
    road_name: Optional[str] = None


# ==========================================
# MULTI-SOURCE INGESTION SCHEMAS
# ==========================================

class IngestionSource(str, Enum):
    CITIZEN_MOBILE = "citizen_mobile"
    CCTV_FEED = "cctv_feed"
    GOOGLE_MAPS = "google_maps_traffic"
    PATROL_VEHICLE = "patrol_vehicle"
    FIELD_ENGINEER = "field_engineer"


class CitizenSubmissionRequest(BaseModel):
    """Mobile citizen report submitted via /report portal."""
    latitude: float
    longitude: float
    state: str = "Karnataka"
    city: str = "Bengaluru"
    category: str = "pothole"  # pothole, waterlogging, guardrail, debris, signage, other
    severity_self_report: int = Field(default=3, ge=1, le=5, description="Citizen self-assessed severity 1-5")
    description: str = ""
    reporter_name: str = "Anonymous Citizen"
    reporter_phone: str = ""
    image_base64: Optional[str] = None
    road_name: Optional[str] = None


class CitizenTicketResponse(BaseModel):
    """Response returned to citizen after submission."""
    ticket_id: str
    status: str = "received"
    hazard_id: Optional[str] = None
    ai_verified: bool = False
    ai_severity: Optional[str] = None
    ai_depth_cm: Optional[float] = None
    ai_risk_score: Optional[float] = None
    estimated_repair_cost_inr: Optional[float] = None
    estimated_repair_days: Optional[int] = None
    message: str = "Your report has been received and is being processed by SadakSuraksha AI."


class CctvFrameIngestRequest(BaseModel):
    """Webhook payload from CCTV / traffic camera systems."""
    camera_id: str
    camera_name: str = "NHAI Toll Camera"
    location_lat: float
    location_lng: float
    state: str = "Karnataka"
    city: str = "Bengaluru"
    road_name: str = "National Highway"
    road_class: RoadClassification = RoadClassification.INTERSTATE
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    timestamp: Optional[str] = None


class GoogleMapsAnomalyRequest(BaseModel):
    """Webhook payload from Google Maps / Telematics traffic anomaly detection."""
    anomaly_id: str = ""
    latitude: float
    longitude: float
    state: str = "Karnataka"
    city: str = "Bengaluru"
    road_name: str = ""
    avg_speed_kmh: float = 40.0
    expected_speed_kmh: float = 60.0
    speed_drop_percent: float = 30.0
    congestion_level: str = "moderate"  # low, moderate, severe
    probe_vehicle_count: int = 10
    avg_vertical_roughness_g: float = 1.0
    timestamp: Optional[str] = None


class IngestionStreamStatus(BaseModel):
    """Status of a connected ingestion feed."""
    source_type: IngestionSource
    source_id: str
    source_name: str
    state: str
    city: str
    status: str = "active"  # active, paused, error, disconnected
    last_frame_at: Optional[str] = None
    total_frames_processed: int = 0
    hazards_detected: int = 0
    false_positives_filtered: int = 0

