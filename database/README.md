# 🗄️ Database Architecture & Schemas

SadakSuraksha AI provides a structured, relational schema designed for high-throughput spatial querying, sensor telemetry logging, and municipal maintenance tracking.

## Tables Overview

- **`road_segments`**: Road network catalog with IRC/PCI indices, AADT traffic, and emergency corridor tags.
- **`hazard_incidents`**: Multimodal road defects with GPS coordinates, vision bounding boxes, physical dimensions, and risk scores.
- **`telemetry_samples`**: High-frequency 3-axis accelerometer and acoustic impact profiles.
- **`citizen_reports`**: Public submissions with photo evidence, auto-GPS, and `CITIZEN-SURAKSHA-XXXX` tracking tickets.
- **`work_orders`**: Spatial clusters of nearby defects for single-dispatch PWD contractor crews.
- **`ingestion_streams`**: Status records for connected CCTV, Google Maps, and mobile feeds.

## Quick Setup

### SQLite (Default Local)
Schema executes automatically in SQLite without external database installation.

### PostgreSQL
```bash
psql -U postgres -d sadaksuraksha -f database/schema.sql
```

### Export JSON Fixtures
```bash
python database/seed_data.py
```
