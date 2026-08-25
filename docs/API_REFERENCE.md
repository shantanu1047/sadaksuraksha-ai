# 📡 SadakSuraksha AI — API Reference Manual

Interactive OpenAPI / Swagger documentation is available locally at: **`http://localhost:8000/docs`**

---

## 1. System & Health

### `GET /api/health`
Checks server health, state statistics, and active currency.
```json
{
  "status": "healthy",
  "service": "SadakSuraksha-AI",
  "region": "All India (Multi-State)",
  "currency": "INR (₹)",
  "active_incidents": 22,
  "active_work_orders": 14
}
```

### `GET /api/states`
Returns all 16 Indian states with defect aggregates and repair costs in ₹.

---

## 2. Hazard Incidents

### `GET /api/hazards`
Query parameters:
- `state`: Optional filter (e.g. `Karnataka`, `Maharashtra`, `Delhi NCR`, etc.)
- `category`: Optional hazard category filter (e.g. `pothole`, `alligator_crack`, `debris`)
- `severity`: Optional severity filter (`critical`, `high`, `medium`, `low`)

### `GET /api/hazards/{hazard_id}`
Returns full multimodal hazard record with 3-axis IMU telemetry trace, acoustic profile, and visual bounding box.

### `POST /api/hazards/inspect`
Ingests an unverified road incident, runs cross-modal sensor fusion, checks for false positives, and returns a verified incident.

---

## 3. Work Orders & Scheduling

### `GET /api/work-orders`
Returns all clustered work orders for contractor dispatch.

### `POST /api/work-orders/generate`
Recomputes spatial clusters across all active incidents using Haversine distance ($r \le 1.5$ km).

### `POST /api/work-orders/{order_id}/status`
Updates status (`scheduled`, `in_progress`, `completed`, `deferred`).

---

## 4. Multi-Source Ingestion & Citizen Reporting

### `POST /api/ingest/citizen-report`
Public submission from citizen smartphone (`/report`).
**Payload**:
```json
{
  "latitude": 12.9340,
  "longitude": 77.6080,
  "state": "Karnataka",
  "city": "Bengaluru",
  "category": "pothole",
  "severity_self_report": 4,
  "description": "Deep crater outside hospital entrance",
  "reporter_name": "Citizen Ramesh",
  "reporter_phone": "9876543210",
  "image_base64": "data:image/jpeg;base64,..."
}
```
**Response**:
```json
{
  "ticket_id": "CITIZEN-SURAKSHA-0001",
  "status": "verified",
  "hazard_id": "HAZ-040",
  "ai_verified": true,
  "ai_severity": "critical",
  "ai_depth_cm": 9.5,
  "ai_risk_score": 94.2,
  "estimated_repair_cost_inr": 28500,
  "estimated_repair_days": 2,
  "message": "AI-verified CRITICAL severity pothole."
}
```

### `GET /api/ingest/citizen-report/{ticket_id}`
Retrieves real-time processing status of a citizen complaint.

### `POST /api/ingest/cctv-feed`
Webhook endpoint for NHAI Toll Plaza & Smart City ICCC cameras.

### `POST /api/ingest/google-maps-traffic`
Webhook for telematics traffic speed drops and vertical roughness probes.

### `GET /api/ingest/streams`
Lists status of all connected regional CCTV, Maps, and citizen streams.

---

## 5. WebSockets

### `WS /ws/patrol-simulation`
Real-time stream of moving patrol vehicle telemetry, delivering GPS coordinates, 3-axis $G_z$ acceleration waves, and acoustic energy at 20 Hz.

