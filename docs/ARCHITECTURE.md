# 🏗️ SadakSuraksha AI — Architectural Specification

SadakSuraksha AI (सड़क सुरक्षा) operates as a high-throughput, cross-modal distributed sensing platform designed to process heterogeneous road inspection data from patrol vehicles, smart city cameras, Google Maps traffic anomalies, and citizen smartphone reports.

---

## 1. System Topology & Data Flow

```
                                  +--------------------------------------------------------+
                                  |                 DATA INGESTION CHANNELS                |
                                  +--------------------------------------------------------+
                                       |                 |                  |           |
                           Patrol Telemetry       CCTV Webhook       Google Maps    Citizen Portal
                           (Camera/IMU/Audio)    (NHAI Cameras)     (Speed/Rough)   (/report Mobile)
                                       |                 |                  |           |
                                       v                 v                  v           v
                          +---------------------------------------------------------------+
                          |                  FASTAPI INGESTION GATEWAY                     |
                          +---------------------------------------------------------------+
                                                          |
                                                          v
                                      +---------------------------------------+
                                      |          CROSS-MODAL FUSION           |
                                      |    (Visual + IMU + Audio + Env)       |
                                      +---------------------------------------+
                                           |                             |
                       True Road Distress  |                             | False Positive (Shadow/Tar)
                                           v                             v
                       +-------------------------------+     +-----------------------+
                       |    IRC / MoRTH PRIORITIZATION |     |  AUDIT LOG & FILTER   |
                       |  (PCI Deduct, AADT, Hospital) |     +-----------------------+
                       +-------------------------------+
                                       |
                                       v
                       +-------------------------------+
                       |  SPATIAL CLUSTERING ENGINE    |
                       |     (Haversine r <= 1.5km)    |
                       +-------------------------------+
                                       |
                                       v
                       +-------------------------------+
                       |      WORK ORDER DISPATCH      |
                       | (Single-Crew Mobilization ₹)  |
                       +-------------------------------+
                                       |
            +--------------------------+--------------------------+
            |                          |                          |
            v                          v                          v
+-----------------------+  +-----------------------+  +-----------------------+
|  GIS COMMAND CENTER   |  |   1-CLICK GOOGLE MAPS |  |  GEMINI INFRA COPILOT |
| (Leaflet Map / Feeds) |  | (Turn-by-Turn Nav UI) |  | (Chat & Strategy Plan)|
+-----------------------+  +-----------------------+  +-----------------------+
```

---

## 2. Mathematical Formulations

### A. Multimodal Cross-Attention Fusion Confidence
The system fuses multi-sensory signals with dynamic modal weighting:

$$S_{\text{fused}} = w_{\text{vis}} S_{\text{vis}} + w_{\text{imu}} S_{\text{imu}} + w_{\text{aud}} S_{\text{aud}} + w_{\text{txt}} S_{\text{txt}}$$

Where:
- $w_{\text{vis}} = 0.40$ (Visual optical bounding box & segmentation confidence)
- $w_{\text{imu}} = 0.35$ (Vertical shock transient $G_z$ and vertical jerk $\dot{G}_z$)
- $w_{\text{aud}} = 0.15$ (High-frequency acoustic thump impact in $dB$)
- $w_{\text{txt}} = 0.10$ (Citizen urgency & complaint NLP signal)

### B. Optical False-Positive Elimination Rule
To prevent expensive false alarms from shadows and fresh asphalt patches:

$$\text{If } S_{\text{vis}} \ge 0.60 \text{ and } S_{\text{imu}} < 0.15 \text{ and } V_{\text{vehicle}} \ge 25\text{ km/h} \implies \text{Flag as False Positive}$$

### C. MoRTH / IRC Risk Prioritization Score
Priority risk score ($0 - 100$) is computed per incident:

$$R = \min\left(100,\; \left(S_{\text{fused}} \times B_{\text{severity}} + \Delta_{\text{PCI}} \times 0.35\right) \times M_{\text{criticality}} \times \left(1 + \frac{\text{AADT}}{200,000}\right)\right)$$

Where Route Criticality Multipliers ($M_{\text{criticality}}$):
- **Hospital Emergency Corridor**: $\times 1.45$
- **School Zone / Transit Corridor**: $\times 1.35$
- **Interstate / Expressway**: $\times 1.25$
- **Arterial**: $\times 1.15$
- **Residential**: $\times 1.00$

---

## 3. Component Modules

| Module Path | Core Responsibilities |
|---|---|
| [`backend/core/vision_engine.py`](../backend/core/vision_engine.py) | Visual defect localization, bounding box generation, and SAM segmentation polygon synthesis. |
| [`backend/core/sensor_fusion.py`](../backend/core/sensor_fusion.py) | Synchronizes IMU accelerometer transients ($G_z$), acoustic dB, and citizen reports to compute $S_{\text{fused}}$ and filter false positives. |
| [`backend/core/prioritization_engine.py`](../backend/core/prioritization_engine.py) | IRC/MoRTH risk scoring, ASTM D6433 PCI deducts, repair technique recommendation, and spatial clustering into work orders. |
| [`backend/services/ingestion_service.py`](../backend/services/ingestion_service.py) | Multi-source webhook processors for CCTV cameras, Google Maps probe anomalies, and citizen `/report` wizard. |
| [`backend/services/copilot_service.py`](../backend/services/copilot_service.py) | Google Gemini 2.5 generative AI reasoning for infrastructure maintenance and strategy generation. |
| [`database/schema.sql`](../database/schema.sql) | Relational SQL schema for PostgreSQL / SQLite production persistence. |
| [`frontend/`](../frontend/) | Real-time Leaflet GIS Command Center, Inspection Studio, Patrol HUD, and mobile-first Citizen Portal. |

