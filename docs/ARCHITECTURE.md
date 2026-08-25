# Architecture & Core Algorithms

## System Overview
SadakSuraksha AI provides a multimodal intelligence platform for road health monitoring.

## Multimodal Sensor Fusion Math
The fusion score combines visual severity (V) and telemetry indicators (T):
$S_{fused} = w_1 \cdot V + w_2 \cdot T$

## False Positive Elimination Algorithm
Cross-checks visual detections against IMU data. If a visual "pothole" has no corresponding z-axis acceleration spike, it's flagged as a false positive.

## IRC / MoRTH Prioritization Engine
Calculates risk scores based on hazard severity and road class, clustering nearby hazards into Work Orders for efficient dispatch.

## Multi-Source Automated Ingestion Pipeline
Ingests data from CCTV, Google Maps, and Citizen Portal.

## Google Maps GPS Integration
1-Click redirects to navigate directly to hazards using `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`.

## Interaction Diagram
Frontend (React/HTML) <-> Backend (FastAPI) <-> DB (PostgreSQL/SQLite)
