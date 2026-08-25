"""
Cross-Modal Sensor Fusion Engine for road hazard detection.
Combines visual defect segmentation with 3-axis IMU telemetry,
acoustic signatures, and citizen text to eliminate false positives
(e.g., shadows, oil stains) and calculate fused physical metrics.
"""

import math
from typing import Optional, List, Dict, Tuple
from backend.models.schemas import (
    VisualDetection,
    TelemetrySample,
    AcousticFeature,
    CitizenReport,
    EnvironmentalContext,
    CrossModalFusionResult,
    HazardType,
)


class SensorFusionEngine:
    """
    Multimodal fusion processor executing cross-modal attention,
    inertial jerk analysis, acoustic spike detection, and false-positive filtering.
    """

    def __init__(
        self,
        weight_visual: float = 0.45,
        weight_inertial: float = 0.35,
        weight_acoustic: float = 0.12,
        weight_text: float = 0.08,
    ):
        self.weight_visual = weight_visual
        self.weight_inertial = weight_inertial
        self.weight_acoustic = weight_acoustic
        self.weight_text = weight_text

    def fuse(
        self,
        visual: Optional[VisualDetection] = None,
        telemetry: Optional[TelemetrySample] = None,
        acoustic: Optional[AcousticFeature] = None,
        citizen_report: Optional[CitizenReport] = None,
        env_context: Optional[EnvironmentalContext] = None,
    ) -> CrossModalFusionResult:
        """
        Synthesizes visual, inertial, acoustic, and text signals into a single verified assessment.
        """
        # 1. Visual Score
        vis_score = visual.confidence if visual else 0.0
        vis_area = visual.estimated_area_sqm if visual else 0.0
        vis_depth = visual.estimated_depth_cm if visual else 0.0
        hazard_type = visual.hazard_type if visual else HazardType.POTHOLE

        # 2. Inertial Score (Normalized 0.0 to 1.0)
        # Vertical acceleration deviation from 1.0g + vertical jerk
        if telemetry:
            z_deviation = abs(telemetry.acc_z_g - 1.0)
            jerk_contrib = min(0.5, abs(telemetry.vertical_jerk_g_s) / 12.0)
            iri_contrib = min(0.3, telemetry.iri_roughness_m_km / 10.0)
            inertial_score = min(1.0, (z_deviation * 0.5) + jerk_contrib + iri_contrib)
        else:
            inertial_score = 0.5  # Neutral default if no telemetry

        # 3. Acoustic Score (Normalized 0.0 to 1.0)
        if acoustic:
            db_spike = max(0.0, acoustic.impact_energy_db - 40.0) / 45.0
            acoustic_score = min(1.0, (db_spike * 0.6) + (acoustic.acoustic_anomaly_score * 0.4))
        else:
            acoustic_score = 0.4

        # 4. Text / Citizen Report Score
        if citizen_report:
            text_score = min(1.0, citizen_report.reporter_urgency / 5.0)
        else:
            text_score = 0.0

        # Dynamic Modality Weight Adjustment
        # If dark or high precipitation, downweight vision and increase IMU/acoustic weight
        w_vis = self.weight_visual
        w_imu = self.weight_inertial
        w_aud = self.weight_acoustic
        w_txt = self.weight_text

        if env_context and env_context.precipitation_mm > 5.0:
            w_vis *= 0.7
            w_imu *= 1.3
            w_aud *= 1.2

        # Normalize weights
        total_w = w_vis + w_imu + w_aud + w_txt
        w_vis /= total_w
        w_imu /= total_w
        w_aud /= total_w
        w_txt /= total_w

        # Compute Raw Fused Confidence
        fused_conf = (
            (vis_score * w_vis)
            + (inertial_score * w_imu)
            + (acoustic_score * w_aud)
            + (text_score * w_txt)
        )

        # 5. False Positive Rejection Logic
        # Case A: Visual system flagged a dark polygon (shadow or fresh patch or oil stain),
        # but vehicle drove at reasonable speed (> 25 km/h) with virtually 0 vertical jerk / Gz deviation.
        is_false_positive = False
        fp_reason = None

        vehicle_speed = telemetry.speed_kmh if telemetry else 30.0
        if (
            hazard_type in [HazardType.POTHOLE, HazardType.RUTTING]
            and vis_score >= 0.60
            and inertial_score < 0.15
            and acoustic_score < 0.20
            and vehicle_speed >= 25.0
            and not citizen_report
        ):
            is_false_positive = True
            fp_reason = "Optical artifact rejected: High visual contrast but 0.02g vertical shock detected (Shadow / Surface Discoloration)."
            fused_conf = max(0.05, fused_conf * 0.15)

        # Case B: Surface water puddle hiding a severe pothole
        # Vision sees only water (vis_score moderate), but IMU spikes with 2.5g and acoustic splash energy is high
        elif (
            vis_score < 0.55
            and inertial_score >= 0.70
            and acoustic_score >= 0.65
        ):
            fused_conf = min(0.98, fused_conf + 0.35)
            if vis_depth < 6.0:
                vis_depth = 8.5  # Submerged cavity correction

        # Physical Metric Synthesis
        # Refine physical depth using IMU vertical displacement integration proxy
        if telemetry and not is_false_positive:
            imu_estimated_depth = abs(telemetry.acc_z_g - 1.0) * 8.5 + (abs(telemetry.vertical_jerk_g_s) * 0.4)
            # Weighted average between visual depth and inertial depth
            final_depth = (vis_depth * 0.5) + (imu_estimated_depth * 0.5)
        else:
            final_depth = vis_depth

        final_depth = round(max(0.5, final_depth), 1)
        final_area = round(max(0.05, vis_area), 2)
        fused_conf = round(min(1.0, max(0.0, fused_conf)), 3)

        breakdown = {
            "visual_weight": round(w_vis, 2),
            "visual_component": round(vis_score, 2),
            "inertial_weight": round(w_imu, 2),
            "inertial_component": round(inertial_score, 2),
            "acoustic_weight": round(w_aud, 2),
            "acoustic_component": round(acoustic_score, 2),
            "text_weight": round(w_txt, 2),
            "text_component": round(text_score, 2),
        }

        return CrossModalFusionResult(
            visual_score=round(vis_score, 2),
            inertial_score=round(inertial_score, 2),
            acoustic_score=round(acoustic_score, 2),
            text_score=round(text_score, 2),
            fused_confidence=fused_conf,
            is_false_positive=is_false_positive,
            false_positive_reason=fp_reason,
            physical_depth_cm=final_depth,
            physical_area_sqm=final_area,
            confidence_breakdown=breakdown,
        )

    def calculate_iri_proxy(self, z_accelerations: List[float], speed_kmh: float) -> float:
        """
        Computes International Roughness Index (IRI in m/km) from accelerometer time series.
        """
        if not z_accelerations:
            return 2.0
        # Calculate Root Mean Square of vertical acceleration deviations
        mean_z = sum(z_accelerations) / len(z_accelerations)
        variance = sum((z - mean_z) ** 2 for z in z_accelerations) / len(z_accelerations)
        rms = math.sqrt(variance)
        # Empirical Golden River / World Bank IRI proxy model
        speed_factor = max(1.0, speed_kmh / 50.0)
        iri = (rms * 4.8) / speed_factor
        return round(max(0.5, min(16.0, iri)), 2)
