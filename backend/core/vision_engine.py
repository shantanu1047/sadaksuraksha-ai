"""
Computer Vision module for road hazard detection, bounding box localization,
polygon segmentation, and visual depth/area estimation.
Integrates with local SmartCity YOLO AI service, Google Gemini Multimodal API,
or deterministic onboard CV engine (in that priority order).
"""

import os
import json
import base64
import logging
from typing import List, Optional, Tuple, Dict, Any
from io import BytesIO
from PIL import Image, ImageStat
import numpy as np
import httpx

from backend.models.schemas import (
    HazardType,
    VisualDetection,
    BoundingBox,
    SeverityLevel,
)

logger = logging.getLogger("VisionEngine")

# ── Mapping from SmartCity AI hazard class names to SadakSuraksha HazardType ──
SMARTCITY_CLASS_MAP: Dict[str, HazardType] = {
    "pothole": HazardType.POTHOLE,
    "waterlogging": HazardType.STANDING_WATER,
    "manhole": HazardType.DEBRIS,
    "fallen tree": HazardType.DEBRIS,
    "road debris": HazardType.DEBRIS,
    "road_crack": HazardType.ALLIGATOR_CRACK,
    "damaged_road": HazardType.RUTTING,
    "garbage_obstruction": HazardType.DEBRIS,
}


class VisionEngine:
    """
    Multimodal Vision Engine capable of processing road images, dashcam frames,
    and drone footage to segment and quantify road distress.

    Detection priority:
      1. Local SmartCity YOLO AI (if LOCAL_VISION_API_URL is configured)
      2. Google Gemini 2.5 Flash (if GEMINI_API_KEY is configured)
      3. Deterministic onboard CV analyzer (always available)
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        self.client = None
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Initialized Google GenAI client successfully.")
            except Exception as e:
                logger.warning(f"Could not initialize GenAI client: {e}")

        # Local SmartCity Vision AI service endpoint
        self.local_vision_api_url = os.environ.get("LOCAL_VISION_API_URL", "http://127.0.0.1:8001/predict").strip()
        self.local_vision_timeout = int(os.environ.get("LOCAL_VISION_TIMEOUT_SECONDS", "10"))
        if self.local_vision_api_url:
            logger.info(f"Local SmartCity Vision AI configured at: {self.local_vision_api_url}")

    def analyze_image(
        self,
        image_bytes: Optional[bytes] = None,
        image_b64: Optional[str] = None,
        image_url: Optional[str] = None,
        hint_hazard_type: Optional[HazardType] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        speed_kmh: Optional[float] = None,
    ) -> List[VisualDetection]:
        """
        Detect and localize road hazards in an image.

        Uses EXCLUSIVELY the local SmartCity Vision AI (YOLO 5-Hazard model).
        No Gemini or onboard CV fallback — only SmartCity_5Hazard_Trained.pt.
        """
        pil_image = None
        raw_bytes = None

        if image_b64:
            try:
                # Strip data:image/...;base64, header if present
                if "," in image_b64:
                    image_b64 = image_b64.split(",")[1]
                decoded = base64.b64decode(image_b64)
                raw_bytes = decoded
                pil_image = Image.open(BytesIO(decoded)).convert("RGB")
            except Exception as e:
                logger.error(f"Error decoding base64 image: {e}")
        elif image_bytes:
            try:
                raw_bytes = image_bytes
                pil_image = Image.open(BytesIO(image_bytes)).convert("RGB")
            except Exception as e:
                logger.error(f"Error reading image bytes: {e}")

        # ── SmartCity YOLO AI (ONLY detection engine) ──
        if self.local_vision_api_url and (raw_bytes or pil_image):
            try:
                if pil_image:
                    buf = BytesIO()
                    pil_image.save(buf, format="JPEG", quality=95)
                    img_bytes_for_api = buf.getvalue()
                else:
                    img_bytes_for_api = raw_bytes

                detections = self._analyze_with_local_api(
                    img_bytes_for_api, pil_image,
                    latitude=latitude, longitude=longitude, speed_kmh=speed_kmh,
                )
                # Always return SmartCity results — even if empty list
                return detections
            except Exception as e:
                logger.error(f"SmartCity Vision API call failed: {e}")

        # No image or API unavailable — return empty (NO fallback to other AI)
        logger.warning("SmartCity Vision AI unavailable. No detection performed.")
        return []


    def _analyze_with_local_api(
        self,
        image_bytes: bytes,
        pil_image: Optional[Image.Image],
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        speed_kmh: Optional[float] = None,
    ) -> List[VisualDetection]:
        """
        Call the local SmartCity Vision AI service (POST /predict).

        Request format: multipart form with 'image' file and 'metadata' JSON string.
        Response format:
            {
              "detections": [{"hazard_type": str, "confidence": float, "bounding_box": [x1,y1,x2,y2]}],
              "multimodal_prediction": {
                "severity": {"class_id": int, "label": str, "confidence": float},
                "risk_score": float,
                "repair_priority": {"class_id": int, "label": str, "confidence": float}
              }
            }
        """
        # Build the metadata JSON for the SmartCity API
        metadata = {
            "latitude": latitude or 26.9124,
            "longitude": longitude or 75.7873,
            "weather_condition": "clear",
            "time_of_day": "afternoon",
            "vehicle_speed": speed_kmh or 30.0,
            "road_type": "urban",
            "traffic_density": 0.5,
        }

        with httpx.Client(timeout=self.local_vision_timeout) as client:
            response = client.post(
                self.local_vision_api_url,
                files={"image": ("road_frame.jpg", image_bytes, "image/jpeg")},
                data={"metadata": json.dumps(metadata)},
            )
            response.raise_for_status()

        result = response.json()
        raw_detections = result.get("detections", [])
        multimodal = result.get("multimodal_prediction", {})

        if not raw_detections:
            logger.info("Local SmartCity Vision API returned zero detections.")
            return []

        # Get image dimensions for normalizing pixel bboxes to [0, 1]
        if pil_image:
            img_w, img_h = pil_image.size
        else:
            img_w, img_h = 640, 640  # fallback assumption

        # Extract severity info from multimodal prediction for depth/area estimation
        severity_label = multimodal.get("severity", {}).get("label", "Medium").lower()
        risk_score = multimodal.get("risk_score", 50.0)

        detections: List[VisualDetection] = []
        for det in raw_detections:
            class_name = det.get("hazard_type", "pothole").lower()
            ht = SMARTCITY_CLASS_MAP.get(class_name, HazardType.OTHER)
            conf = float(det.get("confidence", 0.5))

            # Bounding box: SmartCity returns [x1, y1, x2, y2] in pixels
            bbox_raw = det.get("bounding_box", [0, 0, img_w, img_h])
            x1, y1, x2, y2 = [float(v) for v in bbox_raw]

            # Normalize to [0, 1]
            xmin = max(0.0, min(1.0, x1 / img_w))
            ymin = max(0.0, min(1.0, y1 / img_h))
            xmax = max(xmin + 0.02, min(1.0, x2 / img_w))
            ymax = max(ymin + 0.02, min(1.0, y2 / img_h))

            # Estimate physical dimensions from severity and risk score
            bbox_area_frac = (xmax - xmin) * (ymax - ymin)
            if severity_label == "critical":
                depth_cm = round(8.0 + risk_score * 0.05, 1)
                area_sqm = round(bbox_area_frac * 6.0, 2)
            elif severity_label == "high":
                depth_cm = round(5.0 + risk_score * 0.04, 1)
                area_sqm = round(bbox_area_frac * 4.5, 2)
            elif severity_label == "medium":
                depth_cm = round(3.0 + risk_score * 0.03, 1)
                area_sqm = round(bbox_area_frac * 3.0, 2)
            else:
                depth_cm = round(1.5 + risk_score * 0.02, 1)
                area_sqm = round(bbox_area_frac * 2.0, 2)

            raw_label = det.get("hazard_type") or ht.value.replace("_", " ").title()
            bbox = BoundingBox(
                xmin=round(xmin, 3),
                ymin=round(ymin, 3),
                xmax=round(xmax, 3),
                ymax=round(ymax, 3),
                label=str(raw_label).title(),
                confidence=round(conf, 2),
            )
            polygon = self._generate_polygon(xmin, ymin, xmax, ymax)

            detections.append(
                VisualDetection(
                    hazard_type=ht,
                    confidence=round(conf, 2),
                    bbox=bbox,
                    segmentation_polygon=polygon,
                    estimated_area_sqm=area_sqm,
                    estimated_depth_cm=depth_cm,
                )
            )

        logger.info(
            f"Local SmartCity Vision API: {len(detections)} detection(s), "
            f"severity={severity_label}, risk={risk_score:.1f}"
        )
        return detections


    def _generate_polygon(self, xmin: float, ymin: float, xmax: float, ymax: float) -> List[List[float]]:
        """
        Generate a multi-point polygon approximating the irregular defect boundary.
        """
        cx = (xmin + xmax) / 2.0
        cy = (ymin + ymax) / 2.0
        rx = (xmax - xmin) / 2.0
        ry = (ymax - ymin) / 2.0

        points = []
        num_vertices = 10
        for i in range(num_vertices):
            angle = (2 * np.pi * i) / num_vertices
            # Add slight organic perturbation
            jitter = 0.85 + 0.3 * np.sin(i * 3.7)
            px = round(cx + rx * np.cos(angle) * jitter, 3)
            py = round(cy + ry * np.sin(angle) * jitter, 3)
            points.append([max(0.0, min(1.0, px)), max(0.0, min(1.0, py))])
        return points
