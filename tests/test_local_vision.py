"""
Tests for the local SmartCity Vision AI integration in VisionEngine.

Mocks the HTTP POST to the local /predict endpoint and verifies:
  - Hazard class mapping (SmartCity -> SadakSuraksha HazardType)
  - Bounding box normalization (pixel -> [0, 1])
  - Depth/area estimation from severity
  - Graceful fallback when local API is unavailable
"""

import json
import base64
from io import BytesIO
from unittest.mock import patch, MagicMock

import pytest
from PIL import Image

from backend.core.vision_engine import VisionEngine, SMARTCITY_CLASS_MAP
from backend.models.schemas import HazardType


def _make_test_image_b64(width: int = 640, height: int = 480) -> str:
    """Generate a small JPEG test image as a base64 string."""
    img = Image.new("RGB", (width, height), color=(100, 100, 100))
    buf = BytesIO()
    img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode()


# ── Sample SmartCity /predict response ──
MOCK_PREDICT_RESPONSE = {
    "detections": [
        {
            "hazard_type": "pothole",
            "confidence": 0.96,
            "bounding_box": [120.0, 200.0, 400.0, 420.0],
        },
        {
            "hazard_type": "waterlogging",
            "confidence": 0.82,
            "bounding_box": [50.0, 300.0, 300.0, 460.0],
        },
    ],
    "multimodal_prediction": {
        "severity": {"class_id": 3, "label": "Critical", "confidence": 0.89},
        "risk_score": 92.4,
        "repair_priority": {"class_id": 3, "label": "Urgent", "confidence": 0.91},
    },
}


class TestSmartCityClassMapping:
    """Verify that all SmartCity hazard classes map correctly."""

    def test_all_classes_mapped(self):
        expected = {
            "pothole": HazardType.POTHOLE,
            "road_crack": HazardType.ALLIGATOR_CRACK,
            "waterlogging": HazardType.STANDING_WATER,
            "damaged_road": HazardType.RUTTING,
            "garbage_obstruction": HazardType.DEBRIS,
        }
        assert SMARTCITY_CLASS_MAP == expected

    def test_unknown_class_falls_back_to_other(self):
        assert SMARTCITY_CLASS_MAP.get("unknown_class", HazardType.OTHER) == HazardType.OTHER


class TestLocalVisionApiIntegration:
    """Test _analyze_with_local_api with mocked HTTP responses."""

    def _make_engine(self, api_url: str = "http://127.0.0.1:8001/predict") -> VisionEngine:
        """Create a VisionEngine with local API configured but no Gemini key."""
        with patch.dict("os.environ", {
            "GEMINI_API_KEY": "",
            "LOCAL_VISION_API_URL": api_url,
            "LOCAL_VISION_TIMEOUT_SECONDS": "5",
        }):
            engine = VisionEngine()
        return engine

    @patch("backend.core.vision_engine.httpx.Client")
    def test_successful_detection(self, mock_client_cls):
        """Detections are returned, classes mapped, bboxes normalized."""
        # Set up mock
        mock_response = MagicMock()
        mock_response.json.return_value = MOCK_PREDICT_RESPONSE
        mock_response.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.post.return_value = mock_response
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client_cls.return_value = mock_client

        engine = self._make_engine()
        image_b64 = _make_test_image_b64(640, 480)

        detections = engine.analyze_image(
            image_b64=image_b64,
            latitude=26.9124,
            longitude=75.7873,
        )

        assert len(detections) == 2

        # First detection: pothole
        d0 = detections[0]
        assert d0.hazard_type == HazardType.POTHOLE
        assert d0.confidence == 0.96
        # Normalized bbox: 120/640=0.1875, 200/480=0.4167, 400/640=0.625, 420/480=0.875
        assert 0.15 < d0.bbox.xmin < 0.22
        assert 0.40 < d0.bbox.ymin < 0.45
        assert 0.60 < d0.bbox.xmax < 0.66
        assert 0.85 < d0.bbox.ymax < 0.90

        # Second detection: waterlogging -> STANDING_WATER
        d1 = detections[1]
        assert d1.hazard_type == HazardType.STANDING_WATER
        assert d1.confidence == 0.82

    @patch("backend.core.vision_engine.httpx.Client")
    def test_depth_area_estimation_critical(self, mock_client_cls):
        """Critical severity should produce higher depth/area estimates."""
        mock_response = MagicMock()
        mock_response.json.return_value = MOCK_PREDICT_RESPONSE
        mock_response.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.post.return_value = mock_response
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client_cls.return_value = mock_client

        engine = self._make_engine()
        image_b64 = _make_test_image_b64()

        detections = engine.analyze_image(image_b64=image_b64)
        d0 = detections[0]

        # Critical severity with risk_score=92.4 -> depth >= 8.0 + 92.4*0.05 = 12.62
        assert d0.estimated_depth_cm >= 12.0
        assert d0.estimated_area_sqm > 0

    @patch("backend.core.vision_engine.httpx.Client")
    def test_api_failure_falls_back_to_cv(self, mock_client_cls):
        """If local API raises an exception, should fall back to onboard CV."""
        mock_client = MagicMock()
        mock_client.post.side_effect = Exception("Connection refused")
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client_cls.return_value = mock_client

        engine = self._make_engine()
        image_b64 = _make_test_image_b64()

        # Should NOT raise, should fall back to onboard CV
        detections = engine.analyze_image(image_b64=image_b64)
        assert len(detections) >= 1  # Onboard CV always returns at least 1

    @patch("backend.core.vision_engine.httpx.Client")
    def test_empty_detections_falls_back(self, mock_client_cls):
        """If local API returns zero detections, should fall back to onboard CV."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "detections": [],
            "multimodal_prediction": {
                "severity": {"class_id": 0, "label": "Low", "confidence": 0.5},
                "risk_score": 10.0,
                "repair_priority": {"class_id": 0, "label": "Low", "confidence": 0.5},
            }
        }
        mock_response.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.post.return_value = mock_response
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client_cls.return_value = mock_client

        engine = self._make_engine()
        image_b64 = _make_test_image_b64()

        detections = engine.analyze_image(image_b64=image_b64)
        # Should fall back to onboard CV since local returned empty
        assert len(detections) >= 1

    def test_no_local_api_configured(self):
        """When LOCAL_VISION_API_URL is empty, should skip local API entirely."""
        with patch.dict("os.environ", {
            "GEMINI_API_KEY": "",
            "LOCAL_VISION_API_URL": "",
        }):
            engine = VisionEngine()

        assert engine.local_vision_api_url == ""

        image_b64 = _make_test_image_b64()
        detections = engine.analyze_image(image_b64=image_b64)
        # Should go straight to onboard CV
        assert len(detections) >= 1


class TestSegmentationPolygon:
    """Verify polygon generation for local API detections."""

    @patch("backend.core.vision_engine.httpx.Client")
    def test_polygon_has_10_vertices(self, mock_client_cls):
        mock_response = MagicMock()
        mock_response.json.return_value = MOCK_PREDICT_RESPONSE
        mock_response.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.post.return_value = mock_response
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client_cls.return_value = mock_client

        with patch.dict("os.environ", {
            "GEMINI_API_KEY": "",
            "LOCAL_VISION_API_URL": "http://127.0.0.1:8001/predict",
            "LOCAL_VISION_TIMEOUT_SECONDS": "5",
        }):
            engine = VisionEngine()

        image_b64 = _make_test_image_b64()
        detections = engine.analyze_image(image_b64=image_b64)

        for det in detections:
            assert len(det.segmentation_polygon) == 10
            for point in det.segmentation_polygon:
                assert len(point) == 2
                assert 0.0 <= point[0] <= 1.0
                assert 0.0 <= point[1] <= 1.0
