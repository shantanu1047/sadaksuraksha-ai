"""
Integration tests for FastAPI endpoints (Multi-State India & ₹ INR).
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture(autouse=True)
def client():
    c = TestClient(app)
    c.post("/api/hazards/seed-demo")
    return c


def clear_cloud_storage_env(monkeypatch):
    for key in (
        "DATABASE_URL",
        "POSTGRES_URL",
        "POSTGRES_PRISMA_URL",
        "POSTGRES_URL_NON_POOLING",
        "CLOUD_DB_URL",
        "ALLOW_SERVERLESS_FILE_STORAGE",
    ):
        monkeypatch.delenv(key, raising=False)


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "SadakSuraksha-AI"
    assert "INR" in data["currency"]
    assert "storage_backend" in data
    assert "persistent_storage_configured" in data
    assert "durable_storage_required" in data
    assert data["active_incidents"] >= 0


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


def test_html_routes_serving(client):
    # Gateway at root
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert "text/html" in res_root.headers.get("content-type", "")

    # Login gateway
    res_login = client.get("/login")
    assert res_login.status_code == 200
    assert "text/html" in res_login.headers.get("content-type", "")

    # Official Command Center Dashboard
    res_dash = client.get("/dashboard")
    assert res_dash.status_code == 200
    assert "text/html" in res_dash.headers.get("content-type", "")

    # Citizen Reporting Portal
    res_report = client.get("/report")
    assert res_report.status_code == 200
    assert "text/html" in res_report.headers.get("content-type", "")


def test_road_forecasts_endpoint(client):
    res = client.get("/api/forecast/roads")
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 6
    assert any("Jaipur" in item["location"] for item in items)
    assert any("Bengaluru" in item["location"] for item in items)

    # Test state filter
    res_ka = client.get("/api/forecast/roads?state=Karnataka")
    assert res_ka.status_code == 200
    ka_items = res_ka.json()
    assert all(item["state"] == "Karnataka" for item in ka_items)

    # Test summary
    res_sum = client.get("/api/forecast/summary")
    assert res_sum.status_code == 200
    sum_data = res_sum.json()
    assert sum_data["high_risk_corridors_count"] > 0
    assert sum_data["estimated_prevention_savings_inr"] > 0


def test_forecast_simulation_run(client):
    res = client.post("/api/forecast/run")
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 6
    for item in items:
        assert 0 <= item["forecast_score"] <= 100
        assert item["forecast_risk"] in ["Critical", "High", "Medium", "Low"]


def test_multiple_citizen_reports_persistence_and_work_order_sync(client):
    # Reset clears citizen reports; demo hazards are always restored by sync
    client.post("/api/hazards/reset")

    # After reset, only demo hazards remain — capture this as the baseline
    hazards_before = client.get("/api/hazards").json()
    baseline_count = len(hazards_before)
    assert baseline_count >= 0  # May be 0 (empty demo) or many; just capture it

    # 1. Submit First Complaint (Mumbai — a city with no demo hazards in test DB)
    sub1 = {
        "latitude": 19.0760,
        "longitude": 72.8777,
        "state": "Maharashtra",
        "city": "Mumbai",
        "category": "pothole",
        "severity_self_report": 4,
        "description": "Deep pothole on Western Express Highway.",
        "reporter_name": "Rohan Sharma",
        "road_name": "WEH Bandra Flyover"
    }
    r1 = client.post("/api/ingest/citizen-report", json=sub1)
    assert r1.status_code == 200
    ticket1 = r1.json()["ticket_id"]
    hazard1_id = r1.json()["hazard_id"]

    # 2. Verify total count grew by exactly 1 (one new citizen report added on top of demo data)
    hazards_mid = client.get("/api/hazards").json()
    assert len(hazards_mid) == baseline_count + 1
    ids_mid = [h["id"] for h in hazards_mid]
    assert hazard1_id in ids_mid

    # 3. Verify Work Order was generated for the citizen report
    work_orders_mid = client.get("/api/work-orders").json()
    assert len(work_orders_mid) >= 1
    assert any(hazard1_id in wo.get("target_hazard_ids", []) for wo in work_orders_mid)

    # 4. Submit Second Complaint (Bengaluru)
    sub2 = {
        "latitude": 12.9716,
        "longitude": 77.5946,
        "state": "Karnataka",
        "city": "Bengaluru",
        "category": "alligator_cracking",
        "severity_self_report": 5,
        "description": "Cracked pavement on Outer Ring Road.",
        "reporter_name": "Priya Nair",
        "road_name": "ORR Bellandur"
    }
    r2 = client.post("/api/ingest/citizen-report", json=sub2)
    assert r2.status_code == 200
    hazard2_id = r2.json()["hazard_id"]

    # 5. Verify BOTH citizen complaints persist (total = baseline + 2)
    hazards_after = client.get("/api/hazards").json()
    assert len(hazards_after) == baseline_count + 2
    ids_after = [h["id"] for h in hazards_after]
    assert hazard1_id in ids_after
    assert hazard2_id in ids_after

    # 6. Verify the new citizen reports appear in their respective state filters
    #    (using the specific citizen hazard IDs to be resilient to demo data in same state)
    hazards_mh = client.get("/api/hazards?state=Maharashtra").json()
    mh_ids = [h["id"] for h in hazards_mh]
    assert hazard1_id in mh_ids
    assert any(h["city"] == "Mumbai" and h["id"] == hazard1_id for h in hazards_mh)

    hazards_ka = client.get("/api/hazards?state=Karnataka").json()
    ka_ids = [h["id"] for h in hazards_ka]
    assert hazard2_id in ka_ids
    assert any(h["city"] == "Bengaluru" and h["id"] == hazard2_id for h in hazards_ka)


def test_delete_individual_hazard_report(client):
    # 1. Submit a test report
    sub = {
        "latitude": 13.0827,
        "longitude": 80.2707,
        "state": "Tamil Nadu",
        "city": "Chennai",
        "category": "debris",
        "severity_self_report": 3,
        "description": "Fallen branch blocking Mount Road lane.",
        "reporter_name": "Karthik Raja",
        "road_name": "Anna Salai Mount Road"
    }
    res = client.post("/api/ingest/citizen-report", json=sub)
    assert res.status_code == 200
    hid = res.json()["hazard_id"]

    # 2. Confirm it is present in hazards list
    hazards = client.get("/api/hazards?state=Tamil Nadu").json()
    assert any(h["id"] == hid for h in hazards)

    # 3. Delete the report
    del_res = client.delete(f"/api/hazards/{hid}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"
    assert del_res.json()["deleted_hazard_id"] == hid

    # 4. Verify it is gone from hazards list
    hazards_after = client.get("/api/hazards?state=Tamil Nadu").json()
    assert not any(h["id"] == hid for h in hazards_after)


def test_delete_work_order(client):
    # 1. Fetch work orders
    wos = client.get("/api/work-orders").json()
    assert len(wos) > 0
    target_wo_id = wos[0]["id"]
    initial_count = len(wos)

    # 2. Delete the first work order
    del_res = client.delete(f"/api/work-orders/{target_wo_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"
    assert del_res.json()["deleted_order_id"] == target_wo_id

    # 3. Verify it is removed from work orders list
    wos_after = client.get("/api/work-orders").json()
    assert len(wos_after) == initial_count - 1
    assert not any(wo["id"] == target_wo_id for wo in wos_after)


def test_vercel_without_cloud_rejects_unpersisted_citizen_report(client, monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    clear_cloud_storage_env(monkeypatch)

    client.post("/api/hazards/reset")
    payload = {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "state": "Delhi NCR",
        "city": "New Delhi",
        "category": "pothole",
        "severity_self_report": 4,
        "description": "Fresh Vercel-mode citizen complaint.",
        "reporter_name": "Deployment Test",
        "road_name": "Kartavya Path",
    }

    submit_res = client.post("/api/ingest/citizen-report", json=payload)
    assert submit_res.status_code == 503
    assert "storage is not configured" in submit_res.json()["detail"]

    hazards_res = client.get("/api/hazards")
    assert hazards_res.status_code == 200
    assert hazards_res.json() == []


def test_vercel_without_cloud_rejects_unpersisted_inspection_create(client, monkeypatch):
    client.post("/api/hazards/reset")
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    clear_cloud_storage_env(monkeypatch)

    payload = {
        "latitude": 19.1136,
        "longitude": 72.8697,
        "state": "Maharashtra",
        "city": "Mumbai",
        "speed_kmh": 45.0,
        "acc_z_g": 2.85,
        "vertical_jerk": 14.2,
        "acoustic_db": 80.0,
        "citizen_text": "Live inspection should not be accepted without durable storage.",
        "road_class": "hospital_corridor",
        "road_name": "WEH Medical Corridor",
    }

    response = client.post("/api/hazards/inspect", json=payload)
    assert response.status_code == 503
    assert "storage is not configured" in response.json()["detail"]

    hazards_res = client.get("/api/hazards")
    assert hazards_res.status_code == 200
    assert hazards_res.json() == []


def test_vercel_without_cloud_rolls_back_unpersisted_hazard_delete(client, monkeypatch):
    client.post("/api/hazards/reset")
    payload = {
        "latitude": 13.0827,
        "longitude": 80.2707,
        "state": "Tamil Nadu",
        "city": "Chennai",
        "category": "debris",
        "severity_self_report": 3,
        "description": "Temporary local report used to verify Vercel delete rollback.",
        "reporter_name": "Deployment Test",
        "road_name": "Anna Salai Mount Road",
    }
    create_res = client.post("/api/ingest/citizen-report", json=payload)
    assert create_res.status_code == 200
    hazard_id = create_res.json()["hazard_id"]

    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    clear_cloud_storage_env(monkeypatch)

    delete_res = client.delete(f"/api/hazards/{hazard_id}")
    assert delete_res.status_code == 503
    assert "storage is not configured" in delete_res.json()["detail"]

    hazards_res = client.get("/api/hazards?state=Tamil Nadu")
    assert hazards_res.status_code == 200
    assert any(h["id"] == hazard_id for h in hazards_res.json())


def test_vercel_without_cloud_rolls_back_unpersisted_work_order_delete(client, monkeypatch):
    work_orders = client.get("/api/work-orders").json()
    assert len(work_orders) > 0
    work_order_id = work_orders[0]["id"]

    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    clear_cloud_storage_env(monkeypatch)

    delete_res = client.delete(f"/api/work-orders/{work_order_id}")
    assert delete_res.status_code == 503
    assert "storage is not configured" in delete_res.json()["detail"]

    work_orders_after = client.get("/api/work-orders").json()
    assert any(wo["id"] == work_order_id for wo in work_orders_after)
