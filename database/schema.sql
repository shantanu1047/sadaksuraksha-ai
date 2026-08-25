-- ====================================================================
-- SadakSuraksha AI 🇮🇳 Database Schema (PostgreSQL / SQLite Compatible)
-- PWD / NHAI Multimodal Road Distress & Infrastructure Maintenance DB
-- ====================================================================

-- 1. ROAD SEGMENTS TABLE
CREATE TABLE IF NOT EXISTS road_segments (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    road_class VARCHAR(50) NOT NULL, -- interstate, arterial, collector, residential, school_zone, hospital_corridor
    start_lat DOUBLE PRECISION NOT NULL,
    start_lng DOUBLE PRECISION NOT NULL,
    end_lat DOUBLE PRECISION NOT NULL,
    end_lng DOUBLE PRECISION NOT NULL,
    aadt_traffic INTEGER DEFAULT 50000,
    current_pci DOUBLE PRECISION DEFAULT 70.0,
    hazard_count INTEGER DEFAULT 0,
    last_resurfaced DATE,
    length_km DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. HAZARD INCIDENTS TABLE
CREATE TABLE IF NOT EXISTS hazard_incidents (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    hazard_type VARCHAR(50) NOT NULL, -- pothole, alligator_crack, longitudinal_crack, rutting, damaged_guardrail, obscured_sign, standing_water, debris
    severity VARCHAR(20) NOT NULL,    -- critical, high, medium, low
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    road_id VARCHAR(64) REFERENCES road_segments(id) ON DELETE SET NULL,
    road_name VARCHAR(255) NOT NULL,
    road_class VARCHAR(50) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT NOT NULL,
    detected_at TIMESTAMP NOT NULL,
    is_false_positive BOOLEAN DEFAULT FALSE,
    false_positive_reason TEXT,
    fused_confidence DOUBLE PRECISION NOT NULL,
    physical_depth_cm DOUBLE PRECISION DEFAULT 0.0,
    physical_area_sqm DOUBLE PRECISION DEFAULT 0.0,
    raw_risk_score DOUBLE PRECISION NOT NULL,
    pci_deduct_value DOUBLE PRECISION NOT NULL,
    estimated_repair_cost_inr DOUBLE PRECISION NOT NULL,
    recommended_repair_technique TEXT NOT NULL,
    estimated_crew_hours DOUBLE PRECISION DEFAULT 2.0,
    status VARCHAR(50) DEFAULT 'Active', -- Active, In_Progress, Resolved, Deferred
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TELEMETRY SAMPLES TABLE (3-Axis IMU & Audio)
CREATE TABLE IF NOT EXISTS telemetry_samples (
    id SERIAL PRIMARY KEY,
    hazard_id VARCHAR(64) REFERENCES hazard_incidents(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed_kmh DOUBLE PRECISION NOT NULL,
    acc_x_g DOUBLE PRECISION DEFAULT 0.0,
    acc_y_g DOUBLE PRECISION DEFAULT 0.0,
    acc_z_g DOUBLE PRECISION NOT NULL,
    vertical_jerk_g_s DOUBLE PRECISION NOT NULL,
    iri_roughness_m_km DOUBLE PRECISION NOT NULL,
    acoustic_db DOUBLE PRECISION DEFAULT 40.0,
    dominant_freq_hz DOUBLE PRECISION DEFAULT 300.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CITIZEN REPORTS TABLE (Public / 311 Ingestion)
CREATE TABLE IF NOT EXISTS citizen_reports (
    ticket_id VARCHAR(64) PRIMARY KEY,
    hazard_id VARCHAR(64) REFERENCES hazard_incidents(id) ON DELETE SET NULL,
    reporter_name VARCHAR(150) DEFAULT 'Anonymous Citizen',
    reporter_phone VARCHAR(50),
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    road_name VARCHAR(255),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity_self_report INTEGER DEFAULT 3,
    description TEXT,
    image_base64 TEXT,
    ai_verified BOOLEAN DEFAULT FALSE,
    ai_severity VARCHAR(20),
    ai_depth_cm DOUBLE PRECISION,
    ai_risk_score DOUBLE PRECISION,
    estimated_repair_cost_inr DOUBLE PRECISION,
    estimated_repair_days INTEGER,
    status VARCHAR(50) DEFAULT 'received', -- received, verified, scheduled, completed, rejected_false_positive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. WORK ORDERS TABLE (Spatial Clustered Dispatches)
CREATE TABLE IF NOT EXISTS work_orders (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    assigned_crew VARCHAR(150) NOT NULL,
    scheduled_date DATE NOT NULL,
    estimated_hours DOUBLE PRECISION NOT NULL,
    estimated_cost_inr DOUBLE PRECISION NOT NULL,
    priority_tier VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending_review', -- pending_review, scheduled, in_progress, completed, deferred
    road_closure_needed BOOLEAN DEFAULT FALSE,
    cluster_center_lat DOUBLE PRECISION NOT NULL,
    cluster_center_lng DOUBLE PRECISION NOT NULL,
    target_hazard_ids TEXT NOT NULL, -- JSON array or comma-delimited hazard IDs
    repair_materials TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. INGESTION STREAMS TABLE (CCTV, Google Maps, Patrol Feeds)
CREATE TABLE IF NOT EXISTS ingestion_streams (
    source_id VARCHAR(64) PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL, -- cctv_feed, google_maps_traffic, citizen_mobile, patrol_vehicle
    source_name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, paused, error, disconnected
    last_frame_at TIMESTAMP,
    total_frames_processed INTEGER DEFAULT 0,
    hazards_detected INTEGER DEFAULT 0,
    false_positives_filtered INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_hazards_state ON hazard_incidents(state);
CREATE INDEX IF NOT EXISTS idx_hazards_severity ON hazard_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_hazards_lat_lng ON hazard_incidents(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_roads_state ON road_segments(state);
CREATE INDEX IF NOT EXISTS idx_work_orders_state ON work_orders(state);
CREATE INDEX IF NOT EXISTS idx_citizen_tickets ON citizen_reports(ticket_id);
