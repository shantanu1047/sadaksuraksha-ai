"""
Integration tests for FastAPI endpoints (Multi-State India & ₹ INR).
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "SadakSuraksha-AI"
    assert "INR" in data["currency"]
    assert data["active_incidents"] > 0


def test_list_states(client):
    response = client.get("/api/states")
    assert response.status_code == 200
    states = response.json()
    assert len(states) >= 4
    state_names = [s["state"] for s in states]
    assert "Karnataka" in state_names
    assert "Maharashtra" in state_names


def test_list_hazards_with_state_filter(client):
    # Test Maharashtra filter
    response = client.get("/api/hazards?state=Maharashtra")
    assert response.status_code == 200
    hazards = response.json()
    assert len(hazards) > 0
    for h in hazards:
        assert h["state"] == "Maharashtra"


def test_multimodal_inspection_endpoint(client):
    payload = {
        "latitude": 19.1136,
        "longitude": 72.8697,
        "state": "Maharashtra",
        "city": "Mumbai",
        "speed_kmh": 45.0,
        "acc_z_g": 2.85,
        "vertical_jerk": 14.2,
        "acoustic_db": 80.0,
        "citizen_text": "Live test incident on Western Express Highway.",
        "road_class": "hospital_corridor",
        "road_name": "WEH Medical Corridor",
    }
    response = client.post("/api/hazards/inspect", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["id"].startswith("HAZ-")
    assert data["state"] == "Maharashtra"
    assert data["priority"]["raw_risk_score"] > 50.0
    assert data["priority"]["estimated_repair_cost_usd"] > 1000.0  # In ₹ INR


def test_work_orders_generation(client):
    response = client.post("/api/work-orders/generate")
    assert response.status_code == 200
    work_orders = response.json()
    assert len(work_orders) > 0
    assert "id" in work_orders[0]


def test_copilot_chat(client):
    payload = {
        "prompt": "Which hazards pose the greatest risk to emergency hospital transit corridors in Maharashtra?",
        "state_filter": "Maharashtra",
    }
    response = client.post("/api/copilot/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["answer"]) > 20
    assert "referenced_hazards" in data


def test_citizen_report_submission(client):
    payload = {
        "latitude": 12.9716,
        "longitude": 77.5946,
        "state": "Karnataka",
        "city": "Bengaluru",
        "category": "pothole",
        "severity_self_report": 4,
        "description": "Large pothole near MG Road metro station causing traffic jam.",
        "reporter_name": "Test Citizen",
        "reporter_phone": "9876543210",
    }
    response = client.post("/api/ingest/citizen-report", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["ticket_id"].startswith("CITIZEN-SURAKSHA-")
    assert data["ai_verified"] is True
    assert data["ai_risk_score"] > 0
    assert data["estimated_repair_cost_inr"] > 0


def test_citizen_ticket_tracking(client):
    # First submit a report
    payload = {
        "latitude": 19.0760,
        "longitude": 72.8777,
        "state": "Maharashtra",
        "city": "Mumbai",
        "category": "waterlogging",
        "severity_self_report": 5,
        "description": "Severe waterlogging hiding deep pothole.",
        "reporter_name": "Mumbai Citizen",
    }
    submit_res = client.post("/api/ingest/citizen-report", json=payload)
    ticket_id = submit_res.json()["ticket_id"]

    # Then track it
    track_res = client.get(f"/api/ingest/citizen-report/{ticket_id}")
    assert track_res.status_code == 200
    assert track_res.json()["ticket_id"] == ticket_id


def test_cctv_feed_ingestion(client):
    payload = {
        "camera_id": "CCTV-KA-TOLL-01",
        "camera_name": "NHAI Electronic City Toll Camera",
        "location_lat": 12.8430,
        "location_lng": 77.6630,
        "state": "Karnataka",
        "city": "Bengaluru",
        "road_name": "NH-44 Electronic City Toll",
        "road_class": "interstate",
    }
    response = client.post("/api/ingest/cctv-feed", json=payload)
    assert response.status_code == 200
    assert "status" in response.json()


def test_google_maps_anomaly_ingestion(client):
    payload = {
        "latitude": 12.9340,
        "longitude": 77.6080,
        "state": "Karnataka",
        "city": "Bengaluru",
        "road_name": "Hosur Road",
        "avg_speed_kmh": 15.0,
        "expected_speed_kmh": 50.0,
        "speed_drop_percent": 70.0,
        "congestion_level": "severe",
        "probe_vehicle_count": 25,
        "avg_vertical_roughness_g": 2.4,
    }
    response = client.post("/api/ingest/google-maps-traffic", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "hazard_correlated"
    assert "hazard_id" in data


def test_ingestion_streams_list(client):
    response = client.get("/api/ingest/streams")
    assert response.status_code == 200
    streams = response.json()
    assert len(streams) >= 5
    source_types = [s["source_type"] for s in streams]
    assert "cctv_feed" in source_types
    assert "citizen_mobile" in source_types
    assert "google_maps_traffic" in source_types
