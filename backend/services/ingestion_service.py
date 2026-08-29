"""
Multi-Source Ingestion Service for SadakSuraksha AI.
Processes inputs from: Citizen Mobile Reports, CCTV Camera Feeds,
Google Maps Traffic Anomalies, and Patrol Vehicles.
All costs computed in Indian Rupees (₹ INR).
"""

import random
import logging
import uuid
from datetime import datetime
from typing import List, Dict, Optional, Any

from backend.models.schemas import (
    HazardIncident,
    HazardType,
    SeverityLevel,
    RoadClassification,
    VisualDetection,
    BoundingBox,
    TelemetrySample,
    AcousticFeature,
    CitizenReport,
    EnvironmentalContext,
    CrossModalFusionResult,
    PriorityMetrics,
    CitizenSubmissionRequest,
    CitizenTicketResponse,
    CctvFrameIngestRequest,
    GoogleMapsAnomalyRequest,
    IngestionStreamStatus,
    IngestionSource,
)
from backend.core.vision_engine import VisionEngine
from backend.core.sensor_fusion import SensorFusionEngine
from backend.core.prioritization_engine import PrioritizationEngine
from backend.data.demo_data import generate_sample_telemetry_trace

logger = logging.getLogger("SadakSuraksha.Ingestion")


class IngestionService:
    """Unified ingestion engine for multi-source road hazard data."""

    def __init__(self):
        self.vision_engine = VisionEngine()
        self.fusion_engine = SensorFusionEngine()
        self.prioritization_engine = PrioritizationEngine()
        self.citizen_ticket_counter = 0
        self.citizen_tickets: Dict[str, CitizenTicketResponse] = {}
    def reset(self):
        """Reset ingestion ticket cache and frame counters."""
        self.citizen_tickets.clear()
        self.citizen_ticket_counter = 0
        self.cctv_frame_counter = 0
        self.gmaps_anomaly_counter = 0
        self.ingestion_streams = self._init_demo_streams()

    def _init_demo_streams(self) -> List[IngestionStreamStatus]:
        """Initialize demo ingestion stream statuses."""
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return [
            IngestionStreamStatus(
                source_type=IngestionSource.CCTV_FEED,
                source_id="CCTV-KA-TOLL-01",
                source_name="NHAI Electronic City Toll Plaza Camera",
                state="Karnataka", city="Bengaluru",
                status="active", last_frame_at=now,
                total_frames_processed=1247, hazards_detected=8, false_positives_filtered=3,
            ),
            IngestionStreamStatus(
                source_type=IngestionSource.CCTV_FEED,
                source_id="CCTV-MH-WEH-01",
                source_name="BMC Smart City ICCC Camera — WEH Andheri",
                state="Maharashtra", city="Mumbai",
                status="active", last_frame_at=now,
                total_frames_processed=2890, hazards_detected=14, false_positives_filtered=6,
            ),
            IngestionStreamStatus(
                source_type=IngestionSource.CCTV_FEED,
                source_id="CCTV-DL-RING-01",
                source_name="Delhi PWD ITMS Camera — Ring Road AIIMS",
                state="Delhi NCR", city="New Delhi",
                status="active", last_frame_at=now,
                total_frames_processed=1580, hazards_detected=11, false_positives_filtered=4,
            ),
            IngestionStreamStatus(
                source_type=IngestionSource.GOOGLE_MAPS,
                source_id="GMAPS-IN-TRAFFIC-01",
                source_name="Google Maps India Traffic Anomaly Feed",
                state="All India", city="Multi-City",
                status="active", last_frame_at=now,
                total_frames_processed=5420, hazards_detected=22, false_positives_filtered=9,
            ),
            IngestionStreamStatus(
                source_type=IngestionSource.CITIZEN_MOBILE,
                source_id="CITIZEN-PORTAL-01",
                source_name="SadakSuraksha Citizen Mobile Portal",
                state="All India", city="Multi-City",
                status="active", last_frame_at=now,
                total_frames_processed=340, hazards_detected=285, false_positives_filtered=18,
            ),
            IngestionStreamStatus(
                source_type=IngestionSource.CCTV_FEED,
                source_id="CCTV-TN-OMR-01",
                source_name="Chennai Metro ICCC Camera — OMR Tidel Park",
                state="Tamil Nadu", city="Chennai",
                status="active", last_frame_at=now,
                total_frames_processed=980, hazards_detected=6, false_positives_filtered=2,
            ),
            IngestionStreamStatus(
                source_type=IngestionSource.CCTV_FEED,
                source_id="CCTV-TS-ORR-01",
                source_name="HMDA CCTV — ORR Gachibowli Toll",
                state="Telangana", city="Hyderabad",
                status="active", last_frame_at=now,
                total_frames_processed=760, hazards_detected=5, false_positives_filtered=1,
            ),
        ]

    def _next_ticket_id(self) -> str:
        self.citizen_ticket_counter += 1
        return f"CITIZEN-SURAKSHA-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"

    def _category_to_hazard_type(self, category: str) -> HazardType:
        mapping = {
            "pothole": HazardType.POTHOLE,
            "waterlogging": HazardType.STANDING_WATER,
            "guardrail": HazardType.DAMAGED_GUARDRAIL,
            "debris": HazardType.DEBRIS,
            "signage": HazardType.OBSCURED_SIGN,
            "crack": HazardType.ALLIGATOR_CRACK,
        }
        return mapping.get(category.lower(), HazardType.POTHOLE)

    def process_citizen_report(
        self,
        req: CitizenSubmissionRequest,
        hazards_db: List[HazardIncident],
    ) -> tuple:
        """Process a citizen mobile submission. Returns (HazardIncident, CitizenTicketResponse)."""
        ticket_id = self._next_ticket_id()
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Run vision engine if image provided
        detections = []
        if req.image_base64:
            detections = self.vision_engine.analyze_image(
                image_b64=req.image_base64,
                latitude=req.latitude,
                longitude=req.longitude,
            )
        primary_det = detections[0] if detections else None

        ht = primary_det.hazard_type if primary_det else self._category_to_hazard_type(req.category)

        # Synthesize telemetry from citizen severity (no physical sensor)
        simulated_gz = 1.0 + (req.severity_self_report / 5.0) * 1.8
        telemetry = TelemetrySample(
            timestamp=now,
            latitude=req.latitude, longitude=req.longitude,
            speed_kmh=30.0,
            acc_x_g=0.05, acc_y_g=0.08,
            acc_z_g=round(simulated_gz, 2),
            vertical_jerk_g_s=round(simulated_gz * 4.0, 2),
            iri_roughness_m_km=round((simulated_gz - 1.0) * 4.0 + 2.0, 1),
        )

        acoustic = AcousticFeature(
            timestamp=now,
            dominant_freq_hz=800.0,
            impact_energy_db=50.0 + req.severity_self_report * 5.0,
            acoustic_anomaly_score=min(1.0, req.severity_self_report / 5.0),
            signature_type="citizen_estimate",
        )

        citizen = CitizenReport(
            report_id=ticket_id,
            timestamp=now,
            text_content=req.description or f"Citizen report: {req.category} hazard.",
            reporter_urgency=req.severity_self_report,
            source="SadakSuraksha_Citizen_Portal",
            citizen_category=req.category,
        )

        env = EnvironmentalContext(
            temperature_c=28.0,
            precipitation_mm=8.0,
            freeze_thaw_cycles_24h=0,
            aadt_traffic_volume=55000,
            is_emergency_route=False,
            is_public_transit_corridor=True,
        )

        fusion = self.fusion_engine.fuse(
            visual=primary_det,
            telemetry=telemetry,
            acoustic=acoustic,
            citizen_report=citizen,
            env_context=env,
        )

        if fusion.fused_confidence > 0.80 and fusion.physical_depth_cm > 5.0:
            sev = SeverityLevel.CRITICAL
        elif fusion.fused_confidence > 0.60 or fusion.physical_depth_cm > 3.5:
            sev = SeverityLevel.HIGH
        elif fusion.fused_confidence > 0.35:
            sev = SeverityLevel.MEDIUM
        else:
            sev = SeverityLevel.LOW

        road_class = RoadClassification.ARTERIAL
        priority = self.prioritization_engine.calculate_priority_metrics(
            hazard_type=ht, severity=sev, fusion=fusion,
            road_class=road_class, env_context=env,
        )

        new_id = f"HAZ-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        road_title = req.road_name or f"Citizen Reported Location ({req.city})"
        trace = generate_sample_telemetry_trace(acc_z_peak=simulated_gz, is_bump=(simulated_gz > 1.3))

        incident = HazardIncident(
            id=new_id,
            title=f"Citizen Report: {ht.value.replace('_', ' ').title()} ({sev.value.title()})",
            hazard_type=ht,
            severity=sev,
            state=req.state,
            city=req.city,
            road_id="ROAD-CITIZEN-LIVE",
            road_name=road_title,
            road_class=road_class,
            latitude=req.latitude,
            longitude=req.longitude,
            address=f"Citizen GPS: {req.latitude:.4f}°N, {req.longitude:.4f}°E ({road_title}, {req.city}, {req.state})",
            detected_at=now,
            visual_detections=[primary_det] if primary_det else [],
            telemetry=telemetry,
            acoustic=acoustic,
            citizen_report=citizen,
            env_context=env,
            fusion=fusion,
            priority=priority,
            status="Active",
            image_url=req.image_base64 if req.image_base64 else None,
            telemetry_trace=trace,
        )

        ticket = CitizenTicketResponse(
            ticket_id=ticket_id,
            status="verified" if not fusion.is_false_positive else "rejected_false_positive",
            hazard_id=new_id,
            ai_verified=not fusion.is_false_positive,
            ai_severity=sev.value,
            ai_depth_cm=fusion.physical_depth_cm,
            ai_risk_score=priority.raw_risk_score,
            estimated_repair_cost_inr=priority.estimated_repair_cost_usd,
            estimated_repair_days=max(1, int(7 - priority.raw_risk_score / 20)),
            image_url=req.image_base64 if req.image_base64 else None,
            message=(
                f"Thank you, {req.reporter_name}! Your report has been AI-verified as a "
                f"{sev.value.upper()} severity {ht.value.replace('_', ' ')}. "
                f"Estimated depth: {fusion.physical_depth_cm:.1f}cm. "
                f"PWD repair estimated at ₹{priority.estimated_repair_cost_usd:,.0f}. "
                f"Ticket: {ticket_id}"
            ),
        )

        self.citizen_tickets[ticket_id] = ticket

        # Update citizen stream stats
        for s in self.ingestion_streams:
            if s.source_id == "CITIZEN-PORTAL-01":
                s.total_frames_processed += 1
                s.last_frame_at = now
                if not fusion.is_false_positive:
                    s.hazards_detected += 1
                else:
                    s.false_positives_filtered += 1
                break

        logger.info(f"Citizen report processed: {ticket_id} -> {new_id} ({sev.value})")
        return incident, ticket

    def process_cctv_frame(
        self,
        req: CctvFrameIngestRequest,
        hazards_db: List[HazardIncident],
    ) -> Optional[HazardIncident]:
        """Process a CCTV camera frame. Returns HazardIncident if defect detected."""
        now = req.timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        detections = self.vision_engine.analyze_image(
            image_b64=req.image_base64,
            image_url=req.image_url,
            latitude=req.location_lat,
            longitude=req.location_lng,
        )
        primary_det = detections[0] if detections else None

        # CCTV: no IMU/acoustic, rely on vision + environmental context
        telemetry = TelemetrySample(
            timestamp=now,
            latitude=req.location_lat, longitude=req.location_lng,
            speed_kmh=0.0,  # stationary camera
            acc_x_g=0.0, acc_y_g=0.0, acc_z_g=1.0,
            vertical_jerk_g_s=0.0,
            iri_roughness_m_km=0.0,
        )

        env = EnvironmentalContext(
            temperature_c=28.0,
            precipitation_mm=10.0,
            freeze_thaw_cycles_24h=0,
            aadt_traffic_volume=70000,
            is_emergency_route=(req.road_class == RoadClassification.HOSPITAL_CORRIDOR),
            is_public_transit_corridor=(req.road_class == RoadClassification.ARTERIAL),
        )

        fusion = self.fusion_engine.fuse(
            visual=primary_det,
            telemetry=telemetry,
            acoustic=None,
            citizen_report=None,
            env_context=env,
        )

        # Update CCTV stream stats
        self.cctv_frame_counter += 1
        for s in self.ingestion_streams:
            if s.source_id == req.camera_id:
                s.total_frames_processed += 1
                s.last_frame_at = now
                if not fusion.is_false_positive and fusion.fused_confidence > 0.4:
                    s.hazards_detected += 1
                else:
                    s.false_positives_filtered += 1
                break

        # Only create incident if confidence is significant
        if fusion.fused_confidence < 0.35 or fusion.is_false_positive:
            return None

        ht = primary_det.hazard_type if primary_det else HazardType.POTHOLE
        if fusion.fused_confidence > 0.80:
            sev = SeverityLevel.CRITICAL
        elif fusion.fused_confidence > 0.60:
            sev = SeverityLevel.HIGH
        elif fusion.fused_confidence > 0.40:
            sev = SeverityLevel.MEDIUM
        else:
            sev = SeverityLevel.LOW

        priority = self.prioritization_engine.calculate_priority_metrics(
            hazard_type=ht, severity=sev, fusion=fusion,
            road_class=req.road_class, env_context=env,
        )

        new_id = f"HAZ-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        trace = generate_sample_telemetry_trace(acc_z_peak=1.0, is_bump=False)

        incident = HazardIncident(
            id=new_id,
            title=f"CCTV Detection: {ht.value.replace('_', ' ').title()} [{req.camera_name}]",
            hazard_type=ht,
            severity=sev,
            state=req.state,
            city=req.city,
            road_id=f"ROAD-CCTV-{req.camera_id}",
            road_name=req.road_name,
            road_class=req.road_class,
            latitude=req.location_lat,
            longitude=req.location_lng,
            address=f"CCTV [{req.camera_name}]: {req.location_lat:.4f}°N, {req.location_lng:.4f}°E ({req.road_name}, {req.city}, {req.state})",
            detected_at=now,
            visual_detections=[primary_det] if primary_det else [],
            telemetry=telemetry,
            env_context=env,
            fusion=fusion,
            priority=priority,
            status="Active",
            telemetry_trace=trace,
        )

        logger.info(f"CCTV frame processed from {req.camera_id}: {new_id} ({sev.value})")
        return incident

    def process_google_maps_anomaly(
        self,
        req: GoogleMapsAnomalyRequest,
        hazards_db: List[HazardIncident],
    ) -> Optional[HazardIncident]:
        """Process a Google Maps traffic speed anomaly. Returns HazardIncident if correlated with road damage."""
        now = req.timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Estimate severity from speed drop and roughness
        speed_drop = req.speed_drop_percent
        roughness = req.avg_vertical_roughness_g

        if speed_drop < 20.0 and roughness < 1.2:
            # Likely just normal traffic congestion, not road damage
            self.gmaps_anomaly_counter += 1
            for s in self.ingestion_streams:
                if s.source_type == IngestionSource.GOOGLE_MAPS:
                    s.total_frames_processed += 1
                    s.false_positives_filtered += 1
                    s.last_frame_at = now
                    break
            return None

        # Synthesize telemetry from probe data
        simulated_gz = roughness
        telemetry = TelemetrySample(
            timestamp=now,
            latitude=req.latitude, longitude=req.longitude,
            speed_kmh=req.avg_speed_kmh,
            acc_x_g=0.05, acc_y_g=0.05,
            acc_z_g=round(simulated_gz, 2),
            vertical_jerk_g_s=round((simulated_gz - 1.0) * 8.0, 2),
            iri_roughness_m_km=round((simulated_gz - 1.0) * 4.5 + 2.0, 1),
        )

        env = EnvironmentalContext(
            temperature_c=28.0,
            precipitation_mm=8.0,
            freeze_thaw_cycles_24h=0,
            aadt_traffic_volume=80000,
            is_emergency_route=False,
            is_public_transit_corridor=True,
        )

        fusion = self.fusion_engine.fuse(
            visual=None,
            telemetry=telemetry,
            acoustic=None,
            citizen_report=None,
            env_context=env,
        )

        # Update stream stats
        self.gmaps_anomaly_counter += 1
        for s in self.ingestion_streams:
            if s.source_type == IngestionSource.GOOGLE_MAPS:
                s.total_frames_processed += 1
                s.last_frame_at = now
                if not fusion.is_false_positive:
                    s.hazards_detected += 1
                else:
                    s.false_positives_filtered += 1
                break

        if fusion.is_false_positive or fusion.fused_confidence < 0.30:
            return None

        ht = HazardType.POTHOLE if roughness > 1.5 else HazardType.RUTTING
        if speed_drop > 50.0 and roughness > 2.0:
            sev = SeverityLevel.CRITICAL
        elif speed_drop > 35.0 or roughness > 1.5:
            sev = SeverityLevel.HIGH
        else:
            sev = SeverityLevel.MEDIUM

        road_class = RoadClassification.ARTERIAL
        priority = self.prioritization_engine.calculate_priority_metrics(
            hazard_type=ht, severity=sev, fusion=fusion,
            road_class=road_class, env_context=env,
        )

        new_id = f"HAZ-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        road_title = req.road_name or f"Traffic Anomaly Zone ({req.city})"
        trace = generate_sample_telemetry_trace(acc_z_peak=simulated_gz, is_bump=(simulated_gz > 1.3))

        incident = HazardIncident(
            id=new_id,
            title=f"Traffic Anomaly: {ht.value.replace('_', ' ').title()} ({sev.value.title()}) [{req.congestion_level.upper()}]",
            hazard_type=ht,
            severity=sev,
            state=req.state,
            city=req.city,
            road_id="ROAD-GMAPS-PROBE",
            road_name=road_title,
            road_class=road_class,
            latitude=req.latitude,
            longitude=req.longitude,
            address=f"Google Maps Probe: {req.latitude:.4f}°N, {req.longitude:.4f}°E — Speed drop {speed_drop:.0f}% ({road_title}, {req.city}, {req.state})",
            detected_at=now,
            telemetry=telemetry,
            env_context=env,
            fusion=fusion,
            priority=priority,
            status="Active",
            telemetry_trace=trace,
        )

        logger.info(f"Google Maps anomaly processed: {new_id} ({sev.value}), speed drop {speed_drop}%")
        return incident

    def get_ticket_status(self, ticket_id: str, hazards_db: Optional[List[HazardIncident]] = None) -> Optional[CitizenTicketResponse]:
        """Retrieve citizen ticket status."""
        tid = ticket_id.strip().upper()
        if tid in self.citizen_tickets:
            return self.citizen_tickets[tid]
        if ticket_id in self.citizen_tickets:
            return self.citizen_tickets[ticket_id]
        
        # Search hazards_db if in-memory ticket cache missed
        if hazards_db:
            for h in hazards_db:
                if h.citizen_report and h.citizen_report.report_id and h.citizen_report.report_id.upper() == tid:
                    return CitizenTicketResponse(
                        ticket_id=h.citizen_report.report_id,
                        status="verified" if not h.fusion.is_false_positive else "rejected_false_positive",
                        hazard_id=h.id,
                        ai_verified=not h.fusion.is_false_positive,
                        ai_severity=h.severity.value,
                        ai_depth_cm=h.fusion.physical_depth_cm,
                        ai_risk_score=h.priority.raw_risk_score,
                        estimated_repair_cost_inr=h.priority.estimated_repair_cost_usd,
                        estimated_repair_days=max(1, int(7 - h.priority.raw_risk_score / 20)),
                        image_url=h.image_url,
                        message=f"Verified {h.severity.value.upper()} {h.hazard_type.value.replace('_', ' ')} defect queued for PWD repair."
                    )
        return None

    def get_stream_statuses(self) -> List[IngestionStreamStatus]:
        """Return all active ingestion stream statuses."""
        return self.ingestion_streams
