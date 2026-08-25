"""
Configuration Loader module for AERO-VISION Platform.
Reads config.yaml and environment variable overrides.
"""

import os
from pathlib import Path
from typing import Dict, Any, List, Optional
import yaml
from pydantic import BaseModel, Field

# Root directory of the project
CONFIG_FILE_PATH = Path(__file__).parent.parent.parent / "config.yaml"


def load_raw_config() -> Dict[str, Any]:
    """Load config.yaml with fallback to defaults if file is missing."""
    if CONFIG_FILE_PATH.exists():
        try:
            with open(CONFIG_FILE_PATH, "r", encoding="utf-8") as f:
                return yaml.safe_load(f) or {}
        except Exception as e:
            print(f"Warning: Could not load config.yaml ({e}), using built-in defaults.")
    return {}


_raw = load_raw_config()

# Helper accessors
SERVER_CONFIG = _raw.get("server", {})
AI_CONFIG = _raw.get("ai_models", {})
FUSION_CONFIG = _raw.get("sensor_fusion", {})
PRIO_CONFIG = _raw.get("prioritization", {})
WORK_ORDER_CONFIG = _raw.get("work_orders", {})
PATROL_CONFIG = _raw.get("patrol_simulation", {})

# Server settings
HOST = os.environ.get("HOST", SERVER_CONFIG.get("host", "127.0.0.1"))
PORT = int(os.environ.get("PORT", SERVER_CONFIG.get("port", 8000)))
ENVIRONMENT = os.environ.get("ENVIRONMENT", SERVER_CONFIG.get("environment", "development"))
DEBUG = os.environ.get("DEBUG", str(SERVER_CONFIG.get("debug", True))).lower() in ["true", "1", "yes"]

# Fusion Weights
FUSION_WEIGHTS = FUSION_CONFIG.get("weights", {
    "visual": 0.45,
    "inertial_imu": 0.35,
    "acoustic": 0.12,
    "citizen_text": 0.08,
})

# Route Multipliers
ROUTE_MULTIPLIERS = PRIO_CONFIG.get("route_criticality_multipliers", {
    "hospital_corridor": 1.45,
    "interstate": 1.40,
    "school_zone": 1.35,
    "arterial": 1.25,
    "collector": 1.10,
    "residential": 0.90,
})

# Clustering Parameters
MAX_CLUSTER_RADIUS_KM = float(WORK_ORDER_CONFIG.get("spatial_clustering", {}).get("max_cluster_radius_km", 1.2))
MAX_CREW_HOURS_PER_ORDER = float(WORK_ORDER_CONFIG.get("spatial_clustering", {}).get("max_crew_hours_per_order", 8.0))
