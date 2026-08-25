"""
Unit tests for SensorFusionEngine and cross-modal false positive rejection (India Sector).
"""

import pytest
from backend.models.schemas import (
    HazardType,
    VisualDetection,
    BoundingBox,
    TelemetrySample,
    AcousticFeature,
    CitizenReport,
    EnvironmentalContext,
)
from backend.core.sensor_fusion import SensorFusionEngine


@pytest.fixture
def fusion_engine():
    return SensorFusionEngine()


def test_real_pothole_cross_modal_corroboration(fusion_engine):
    """Test that a visual pothole with high vertical shock produces a high fused confidence."""
    bbox = BoundingBox(xmin=0.3, ymin=0.4, xmax=0.7, ymax=0.8, label="Pothole", confidence=0.92)
    visual = VisualDetection(
        hazard_type=HazardType.POTHOLE,
        confidence=0.92,
        bbox=bbox,
        estimated_area_sqm=0.8,
        estimated_depth_cm=8.5,
    )
    telemetry = TelemetrySample(
        timestamp="2026-08-25 12:00:00",
        latitude=12.9340,
        longitude=77.6080,
        speed_kmh=45.0,
        acc_x_g=0.1,
        acc_y_g=0.2,
        acc_z_g=2.7,
        vertical_jerk_g_s=12.0,
        iri_roughness_m_km=6.5,
    )
    acoustic = AcousticFeature(
        timestamp="2026-08-25 12:00:00",
        dominant_freq_hz=1200.0,
        impact_energy_db=75.0,
        acoustic_anomaly_score=0.85,
    )

    result = fusion_engine.fuse(visual=visual, telemetry=telemetry, acoustic=acoustic)
    assert not result.is_false_positive
    assert result.fused_confidence >= 0.75
    assert result.physical_depth_cm > 6.0


def test_shadow_false_positive_rejection(fusion_engine):
    """Test that an optical shadow with 0.0g vertical shock is flagged as a false positive."""
    bbox = BoundingBox(xmin=0.3, ymin=0.4, xmax=0.6, ymax=0.7, label="Pothole", confidence=0.85)
    visual = VisualDetection(
        hazard_type=HazardType.POTHOLE,
        confidence=0.85,
        bbox=bbox,
        estimated_area_sqm=0.4,
        estimated_depth_cm=4.0,
    )
    telemetry = TelemetrySample(
        timestamp="2026-08-25 12:00:00",
        latitude=12.9350,
        longitude=77.6280,
        speed_kmh=35.0,
        acc_x_g=0.01,
        acc_y_g=0.01,
        acc_z_g=1.01,
        vertical_jerk_g_s=0.05,
        iri_roughness_m_km=1.1,
    )
    acoustic = AcousticFeature(
        timestamp="2026-08-25 12:00:00",
        dominant_freq_hz=200.0,
        impact_energy_db=38.0,
        acoustic_anomaly_score=0.05,
    )

    result = fusion_engine.fuse(visual=visual, telemetry=telemetry, acoustic=acoustic)
    assert result.is_false_positive is True
    assert "Optical artifact" in result.false_positive_reason
    assert result.fused_confidence < 0.25


def test_submerged_pothole_elevation(fusion_engine):
    """Test that low visual contrast obscured by water is elevated when high IMU shock occurs."""
    bbox = BoundingBox(xmin=0.3, ymin=0.4, xmax=0.6, ymax=0.7, label="Pothole", confidence=0.45)
    visual = VisualDetection(
        hazard_type=HazardType.POTHOLE,
        confidence=0.45,
        bbox=bbox,
        estimated_area_sqm=0.7,
        estimated_depth_cm=3.5,
    )
    telemetry = TelemetrySample(
        timestamp="2026-08-25 12:00:00",
        latitude=12.9360,
        longitude=77.6910,
        speed_kmh=40.0,
        acc_x_g=0.2,
        acc_y_g=0.2,
        acc_z_g=2.5,
        vertical_jerk_g_s=11.0,
        iri_roughness_m_km=7.0,
    )
    acoustic = AcousticFeature(
        timestamp="2026-08-25 12:00:00",
        dominant_freq_hz=900.0,
        impact_energy_db=72.0,
        acoustic_anomaly_score=0.80,
    )

    result = fusion_engine.fuse(visual=visual, telemetry=telemetry, acoustic=acoustic)
    assert not result.is_false_positive
    assert result.fused_confidence >= 0.70
    assert result.physical_depth_cm >= 6.0
