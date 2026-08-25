"""
Unit tests for PrioritizationEngine (PCI, PVI, Multi-criteria Risk Scoring, Spatial Clustering).
"""

import pytest
from backend.models.schemas import (
    HazardType,
    SeverityLevel,
    RoadClassification,
    CrossModalFusionResult,
    EnvironmentalContext,
    HazardIncident,
)
from backend.core.prioritization_engine import PrioritizationEngine
from backend.data.demo_data import get_demo_hazards


@pytest.fixture
def prio_engine():
    return PrioritizationEngine()


def test_hospital_route_priority_multiplier(prio_engine):
    """Verify that hospital corridors receive a risk multiplier compared to residential roads."""
    fusion = CrossModalFusionResult(
        visual_score=0.9,
        inertial_score=0.9,
        acoustic_score=0.8,
        text_score=0.8,
        fused_confidence=0.88,
        is_false_positive=False,
        physical_depth_cm=8.0,
        physical_area_sqm=1.0,
    )

    env_hospital = EnvironmentalContext(
        temperature_c=5.0,
        precipitation_mm=0.0,
        freeze_thaw_cycles_24h=1,
        aadt_traffic_volume=25000,
        is_emergency_route=True,
        is_public_transit_corridor=True,
    )

    env_residential = EnvironmentalContext(
        temperature_c=5.0,
        precipitation_mm=0.0,
        freeze_thaw_cycles_24h=1,
        aadt_traffic_volume=2000,
        is_emergency_route=False,
        is_public_transit_corridor=False,
    )

    prio_hospital = prio_engine.calculate_priority_metrics(
        hazard_type=HazardType.POTHOLE,
        severity=SeverityLevel.CRITICAL,
        fusion=fusion,
        road_class=RoadClassification.HOSPITAL_CORRIDOR,
        env_context=env_hospital,
    )

    prio_res = prio_engine.calculate_priority_metrics(
        hazard_type=HazardType.POTHOLE,
        severity=SeverityLevel.CRITICAL,
        fusion=fusion,
        road_class=RoadClassification.RESIDENTIAL,
        env_context=env_residential,
    )

    assert prio_hospital.raw_risk_score > prio_res.raw_risk_score
    assert prio_hospital.safety_urgency_multiplier >= 1.40


def test_spatial_clustering_work_order_generation(prio_engine):
    """Test that multiple defects within proximity are clustered into unified work orders."""
    hazards = get_demo_hazards()
    work_orders = prio_engine.cluster_and_generate_work_orders(hazards, max_cluster_radius_km=1.5)

    assert len(work_orders) > 0
    # Verify that work orders have aggregated costs and hazards
    for wo in work_orders:
        assert len(wo.target_hazard_ids) >= 1
        assert wo.estimated_cost_usd > 0
        assert wo.assigned_crew is not None
