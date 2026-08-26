"""
Prioritization & Risk Index Engine for municipal road infrastructure maintenance.
Calculates ASTM D6433 & IRC Pavement Condition Index (PCI) deducts, Pavement Vulnerability
Index (PVI), multi-criteria hazard risk scores, and spatial work-order batching in Indian Rupees (₹ INR).
"""

import math
from typing import List, Dict, Any, Optional
from backend.models.schemas import (
    HazardType,
    SeverityLevel,
    RoadClassification,
    PriorityMetrics,
    CrossModalFusionResult,
    EnvironmentalContext,
    HazardIncident,
    WorkOrder,
    WorkOrderStatus,
)


class PrioritizationEngine:
    """
    Computes engineering metrics (PCI, PVI, Risk) and generates cost-optimized
    maintenance work orders in Indian Rupees (₹ INR) following MoRTH/IRC guidelines.
    """

    def calculate_priority_metrics(
        self,
        hazard_type: HazardType,
        severity: SeverityLevel,
        fusion: CrossModalFusionResult,
        road_class: RoadClassification,
        env_context: Optional[EnvironmentalContext] = None,
    ) -> PriorityMetrics:
        """
        Calculate holistic priority risk score, PCI deduct, PVI, and repair cost in ₹ INR.
        """
        # 1. Base Severity Score (0-100)
        severity_base = {
            SeverityLevel.CRITICAL: 90.0,
            SeverityLevel.HIGH: 70.0,
            SeverityLevel.MEDIUM: 45.0,
            SeverityLevel.LOW: 20.0,
        }.get(severity, 40.0)

        # 2. Physical Volumetric Impact Score
        depth_cm = fusion.physical_depth_cm
        area_sqm = fusion.physical_area_sqm

        # Depth score: > 7cm is severe damage to two-wheelers, auto-rickshaws and cars
        depth_score = min(100.0, (depth_cm / 10.0) * 100.0)
        area_score = min(100.0, (area_sqm / 2.5) * 100.0)
        volumetric_score = (depth_score * 0.65) + (area_score * 0.35)

        # 3. ASTM D6433 / IRC Pavement Condition Index (PCI) Deduct Value
        pci_deduct = self._compute_pci_deduct(hazard_type, severity, area_sqm, depth_cm)

        # 4. Traffic & Route Criticality Multipliers
        aadt = env_context.aadt_traffic_volume if env_context else 25000
        is_emergency = env_context.is_emergency_route if env_context else False
        is_transit = env_context.is_public_transit_corridor if env_context else False

        # Road class baseline multiplier in Indian context
        class_weight = {
            RoadClassification.HOSPITAL_CORRIDOR: 1.45,
            RoadClassification.INTERSTATE: 1.40,        # National Highway / Expressway
            RoadClassification.SCHOOL_ZONE: 1.35,
            RoadClassification.ARTERIAL: 1.25,           # Major Ring Road / Radial Road
            RoadClassification.COLLECTOR: 1.10,          # Ward connecting arterial
            RoadClassification.RESIDENTIAL: 0.90,        # Colony / Layout road
        }.get(road_class, 1.0)

        if is_emergency:
            class_weight = max(class_weight, 1.45)
        if is_transit:
            class_weight = max(class_weight, 1.30)

        # Traffic Factor (0.8 to 1.4)
        traffic_factor = min(1.4, max(0.8, 0.8 + (aadt / 50000.0) * 0.6))

        # 5. Environmental Degradation Acceleration Factor (Monsoon & Thermal stress)
        freeze_thaw = env_context.freeze_thaw_cycles_24h if env_context else 0
        precip = env_context.precipitation_mm if env_context else 0.0

        # Heavy monsoon water logging penetrates cracks, causing rapid sub-base erosion
        env_factor = 1.0 + (freeze_thaw * 0.08) + min(0.35, precip * 0.02)

        # 6. Pavement Vulnerability Index (PVI, 0 to 100)
        pvi = min(
            100.0,
            (volumetric_score * 0.4)
            + (pci_deduct * 0.35)
            + ((env_factor - 1.0) * 100.0 * 0.25),
        )

        # 7. Composite Risk Score (0 to 100)
        composite_raw = (
            (severity_base * 0.30)
            + (volumetric_score * 0.25)
            + (pci_deduct * 0.20)
            + (fusion.fused_confidence * 100.0 * 0.25)
        )

        final_risk = composite_raw * class_weight * traffic_factor * (env_factor ** 0.5)

        # False positive optical artifact penalty
        if fusion.is_false_positive:
            final_risk = min(5.0, final_risk * 0.05)

        final_risk = round(min(100.0, max(0.0, final_risk)), 1)

        # 8. Repair Technique & Cost Estimation (in ₹ INR)
        technique, cost_inr, hours = self._estimate_repair_inr(hazard_type, severity, area_sqm, depth_cm)

        return PriorityMetrics(
            raw_risk_score=final_risk,
            pci_deduct_value=round(pci_deduct, 1),
            pavement_vulnerability_index=round(pvi, 1),
            safety_urgency_multiplier=round(class_weight, 2),
            traffic_impact_factor=round(traffic_factor, 2),
            environmental_acceleration_factor=round(env_factor, 2),
            final_priority_rank=1,
            estimated_repair_cost_usd=cost_inr,  # Stores numeric value in INR
            recommended_repair_technique=technique,
            estimated_crew_hours=hours,
        )

    def _compute_pci_deduct(
        self,
        hazard_type: HazardType,
        severity: SeverityLevel,
        area_sqm: float,
        depth_cm: float
    ) -> float:
        base_deducts = {
            HazardType.POTHOLE: {"critical": 65.0, "high": 48.0, "medium": 32.0, "low": 15.0},
            HazardType.ALLIGATOR_CRACK: {"critical": 55.0, "high": 42.0, "medium": 26.0, "low": 12.0},
            HazardType.RUTTING: {"critical": 50.0, "high": 38.0, "medium": 22.0, "low": 10.0},
            HazardType.LONGITUDINAL_CRACK: {"critical": 35.0, "high": 24.0, "medium": 15.0, "low": 6.0},
            HazardType.STANDING_WATER: {"critical": 45.0, "high": 30.0, "medium": 18.0, "low": 8.0},
            HazardType.DAMAGED_GUARDRAIL: {"critical": 60.0, "high": 40.0, "medium": 20.0, "low": 8.0},
            HazardType.OBSCURED_SIGN: {"critical": 40.0, "high": 25.0, "medium": 14.0, "low": 5.0},
            HazardType.DEBRIS: {"critical": 50.0, "high": 35.0, "medium": 20.0, "low": 8.0},
        }

        sev_key = severity.value
        deduct_dict = base_deducts.get(hazard_type, {"critical": 40.0, "high": 30.0, "medium": 20.0, "low": 10.0})
        base = deduct_dict.get(sev_key, 25.0)

        scale = min(1.4, max(0.8, 0.8 + (area_sqm * 0.15) + (depth_cm * 0.03)))
        return min(95.0, base * scale)

    def _estimate_repair_inr(
        self,
        hazard_type: HazardType,
        severity: SeverityLevel,
        area_sqm: float,
        depth_cm: float
    ) -> tuple[str, float, float]:
        """
        Calculates recommended repair method according to Indian MoRTH / IRC specifications,
        estimated cost in Indian Rupees (₹ INR), and crew hours.
        """
        if hazard_type == HazardType.POTHOLE:
            if severity in [SeverityLevel.CRITICAL, SeverityLevel.HIGH] or depth_cm > 6.0:
                technique = "Full-Depth Bituminous Concrete (BC) Milling & Hot Mix Compaction (MoRTH Spec 500)"
                cost = 12500.0 + (area_sqm * 3800.0) + (depth_cm * 650.0)
                hours = 2.5 + (area_sqm * 0.8)
            else:
                technique = "Rapid Cold-Mix Polymer Bituminous Pothole Infusion (IRC:116 Standard)"
                cost = 4200.0 + (area_sqm * 1800.0)
                hours = 1.2
        elif hazard_type == HazardType.ALLIGATOR_CRACK:
            if severity == SeverityLevel.CRITICAL:
                technique = "Full-Depth Base Stabilization & Dense Bituminous Macadam (DBM) Overlay"
                cost = 28000.0 + (area_sqm * 7500.0)
                hours = 5.0 + (area_sqm * 1.2)
            else:
                technique = "Hot-Applied Polymer Modified Bitumen (CRMB) Crack Sealing (IRC:SP:84)"
                cost = 8500.0 + (area_sqm * 2400.0)
                hours = 2.0
        elif hazard_type == HazardType.LONGITUDINAL_CRACK:
            technique = "High-Pressure Air Cleaning & Rubberized Bitumen Crack Sealing"
            cost = 5200.0 + (area_sqm * 1600.0)
            hours = 1.5
        elif hazard_type == HazardType.RUTTING:
            technique = "Cold Milling of Rutted Bituminous Surface & High-Stability Wearing Course"
            cost = 22000.0 + (area_sqm * 4500.0)
            hours = 4.0
        elif hazard_type == HazardType.DAMAGED_GUARDRAIL:
            technique = "MoRTH Metal Beam Crash Barrier (W-Beam) Replacement & Post Realignment"
            cost = 36000.0 + (area_sqm * 3200.0)
            hours = 3.5
        elif hazard_type == HazardType.OBSCURED_SIGN:
            technique = "High-Intensity Microprismatic IRC Regulatory Sign Re-erection & Pruning"
            cost = 6500.0
            hours = 1.0
        elif hazard_type == HazardType.STANDING_WATER:
            technique = "Stormwater Catch-Pit Desilting & Culvert Jetting (Monsoon Readiness)"
            cost = 14000.0
            hours = 2.5
        else:  # Debris
            technique = "Roadway Obstacle Emergency Clearing & Mechanical Sweeping"
            cost = 4500.0
            hours = 0.8

        return technique, round(cost, 2), round(hours, 1)

    def cluster_and_generate_work_orders(
        self,
        hazards: List[HazardIncident],
        max_cluster_radius_km: float = 1.5,
        max_hours_per_order: float = 8.0,
    ) -> List[WorkOrder]:
        """
        Spatial clustering algorithm grouping nearby high-priority defects
        into single crew work orders to minimize road closures and mobilization costs.
        """
        actionable = [
            h for h in hazards
            if not h.fusion.is_false_positive and h.status.lower() in ["active", "pending", "unresolved", "in progress", "in_progress", "scheduled", "assigned"]
        ]

        if not actionable:
            return []

        sorted_hazards = sorted(actionable, key=lambda x: x.priority.raw_risk_score, reverse=True)

        assigned_hazard_ids = set()
        work_orders: List[WorkOrder] = []
        crews = [
            "PWD Rapid Action Pothole Unit 1",
            "NHAI Corridor Incident Response Team",
            "Smart City Emergency Road Crew Alpha",
            "Zonal Infra Maintenance Fleet 4"
        ]

        order_idx = 1
        for primary in sorted_hazards:
            if primary.id in assigned_hazard_ids:
                continue

            cluster = [primary]
            assigned_hazard_ids.add(primary.id)
            total_hours = primary.priority.estimated_crew_hours

            for candidate in sorted_hazards:
                if candidate.id in assigned_hazard_ids:
                    continue

                dist = self._haversine_km(
                    primary.latitude, primary.longitude,
                    candidate.latitude, candidate.longitude
                )

                if dist <= max_cluster_radius_km and (total_hours + candidate.priority.estimated_crew_hours) <= max_hours_per_order:
                    cluster.append(candidate)
                    assigned_hazard_ids.add(candidate.id)
                    total_hours += candidate.priority.estimated_crew_hours

            total_cost = sum(h.priority.estimated_repair_cost_usd for h in cluster)
            materials = list(set([h.priority.recommended_repair_technique.split()[0] + " Materials" for h in cluster]))
            
            center_lat = sum(h.latitude for h in cluster) / len(cluster)
            center_lng = sum(h.longitude for h in cluster) / len(cluster)

            max_risk = max(h.priority.raw_risk_score for h in cluster)
            if max_risk >= 80.0:
                tier = "Tier 1 - Immediate Emergency (24h)"
            elif max_risk >= 60.0:
                tier = "Tier 2 - High Priority (48-72h)"
            else:
                tier = "Tier 3 - Scheduled Routine (7-14 Days)"

            crew_name = crews[(order_idx - 1) % len(crews)]
            road_closure = any(h.priority.raw_risk_score > 70.0 for h in cluster)

            summary_items = [
                {
                    "hazard_id": h.id,
                    "title": h.title,
                    "hazard_type": h.hazard_type.value,
                    "severity": h.severity.value,
                    "risk_score": h.priority.raw_risk_score,
                    "address": h.address,
                    "repair_technique": h.priority.recommended_repair_technique,
                    "cost_inr": h.priority.estimated_repair_cost_usd,
                }
                for h in cluster
            ]

            wo = WorkOrder(
                id=f"WO-2026-{order_idx:03d}",
                title=f"Cluster Dispatch: {cluster[0].road_name} Sector ({len(cluster)} Defects)",
                target_hazard_ids=[h.id for h in cluster],
                assigned_crew=crew_name,
                scheduled_date="2026-08-27",
                estimated_hours=round(total_hours, 1),
                estimated_cost_usd=round(total_cost, 2),
                priority_tier=tier,
                status=WorkOrderStatus.SCHEDULED,
                repair_materials=materials,
                road_closure_needed=road_closure,
                cluster_center_lat=round(center_lat, 5),
                cluster_center_lng=round(center_lng, 5),
                hazards_summary=summary_items,
            )
            work_orders.append(wo)
            order_idx += 1

        return work_orders

    def _haversine_km(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        r = 6371.0
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (
            math.sin(d_lat / 2.0) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(d_lon / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return r * c
