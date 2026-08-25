# 🛣️ SadakSuraksha AI 🇮🇳 (सड़क सुरक्षा)
### Multimodal AI Road Hazard Detection, IRC Prioritization & Infrastructure Maintenance Platform

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tests Passing](https://img.shields.io/badge/Tests-16%2F16%20Passed-brightgreen.svg)]()
[![Region: India](https://img.shields.io/badge/Region-Pan--India%20(16%20States)-orange.svg)]()
[![Currency: INR](https://img.shields.io/badge/Currency-%E2%82%B9%20INR%20(MoRTH%2FIRC)-green.svg)]()

SadakSuraksha AI is a full-stack, multimodal intelligence system designed for Indian public works departments (PWD), NHAI, smart cities, and municipal corporations to detect, classify, prioritize, and manage road hazards across 16 Indian states and Union Territories.

---

## 🌟 Core System Capabilities

1. **Multimodal Defect Detection & Segmentation**:
   - Localizes potholes, fatigue alligator cracks, longitudinal cracks, rutting, damaged guardrails, obscured signage, standing water, and road debris.
   - Computes physical cavity depth ($cm$) and area ($m^2$) by fusing stereoscopic vision and 3-axis accelerometer transients.

2. **Cross-Modal Attention & False-Positive Elimination**:
   - Cross-correlates visual distress candidates with high-rate 3-axis accelerometer vertical jerk ($G_z$) and acoustic impact energy ($dB$).
   - Automatically filters optical false positives (tree shadows, fresh tar patches, paint marks) with $0.02g$ impact reading.
   - Elevates submerged/water-filled cavities where reflections hide deep potholes ($2.5g+$ shock).

3. **MoRTH & Indian Roads Congress (IRC) Prioritization Matrix**:
   - Dynamic prioritization factoring severity, traffic density (AADT), and route criticality multipliers:
     - Emergency hospital corridors $\times 1.45$
     - School zones $\times 1.35$
     - Transit routes $\times 1.30$
   - All repair estimates formatted in **Indian Rupees (₹ INR)** adhering to MoRTH schedule of rates.

4. **1-Click Google Maps Redirection**:
   - Deep GPS integration across map popups, feed cards, work order clusters, and citizen tickets with instant turn-by-turn navigation (`https://www.google.com/maps/dir/?api=1&destination=lat,lng`).

5. **Multi-Source Automated Ingestion Feeds**:
   - 📹 **NHAI & Smart City CCTV**: Continuous camera stream webhook processing.
   - 🗺️ **Google Maps Traffic Anomaly Feed**: Telematics speed drop and roughness correlation.
   - 🚗 **Patrol Vehicle Telemetry**: Real-time WebSocket streaming HUD.
   - 📱 **Citizen Mobile Reporting Portal (`/report`)**: Mobile-first citizen reporting web app with auto-GPS, camera capture, AI verification, and ticket tracking (`CITIZEN-SURAKSHA-XXXX`).

6. **Gemini Infrastructure AI Co-Pilot**:
   - Conversational municipal engineering assistant for root-cause diagnosis, IRC repair technique selection, and contractor dispatch planning.

---

## 📁 Repository Structure & Module Breakdown

The project is strictly partitioned into modular components for parallel team development:

```
road_hazard_ai/
├── backend/                      # 🐍 Backend API & Processing Engines (FastAPI)
│   ├── main.py                   # REST endpoints, WebSockets, & static file routing
│   ├── core/                     # Algorithmic & AI engines
│   │   ├── vision_engine.py      # Visual defect localization & SAM polygon overlay
│   │   ├── sensor_fusion.py      # Cross-modal fusion & false-positive filter
│   │   ├── prioritization_engine.py # IRC risk scoring & spatial clustering
│   │   └── config.py             # Global system settings & weights
│   ├── models/                   # Pydantic domain models & schemas
│   │   └── schemas.py            # Hazards, telemetry, work orders, citizen reports
│   ├── services/                 # Application business logic
│   │   ├── ingestion_service.py  # CCTV, Google Maps & citizen report ingestion
│   │   └── copilot_service.py    # Google Gemini generative infrastructure co-pilot
│   └── data/                     # Data access & seed fixtures
│       └── demo_data.py          # Pan-India 16-state road network dataset
│
├── frontend/                     # 🌐 Frontend Web Applications (HTML5/Tailwind/JS)
│   ├── index.html                # Municipal Command Center & GIS Dashboard
│   ├── report.html               # Mobile-First Citizen Reporting Portal (/report)
│   ├── css/
│   │   └── styles.css            # High-contrast dark theme & custom styling
│   └── js/
│       └── app.js                # Leaflet GIS map, Chart.js, & state controllers
│
├── database/                     # 🗄️ Database Schemas & Seed Scripts
│   ├── schema.sql                # PostgreSQL / SQLite relational table definitions
│   ├── seed_data.py              # Export & seed database fixtures
│   └── README.md                 # Database setup and ER diagram documentation
│
├── docs/                         # 📚 Engineering & Team Documentation
│   ├── ARCHITECTURE.md           # System architecture, fusion math, and data flows
│   ├── API_REFERENCE.md          # Complete REST, WebHook, & WebSocket API reference
│   └── CONTRIBUTING.md           # Team branching model, code standards, & testing
│
├── tests/                        # 🧪 Automated Test Suite (16/16 Passing)
│   ├── test_api.py               # API endpoints, ingestion, & citizen portal tests
│   ├── test_fusion.py            # Sensor fusion & false-positive elimination tests
│   └── test_prioritization.py    # IRC prioritization & spatial clustering tests
│
├── Dockerfile                    # Containerization image definition
├── docker-compose.yml            # Multi-container orchestration
├── pyproject.toml                # Project metadata & dependencies
├── requirements.txt              # Pip dependency specification
├── start.bat                     # Windows 1-click launcher
├── start.ps1                     # PowerShell 1-click launcher
├── start.sh                      # Linux / macOS 1-click launcher
├── .env.example                  # Environment variable configuration template
└── .gitignore                    # Comprehensive Git ignore rules
```

---

## 🚀 Quickstart for Developers

### Prerequisites
- Python 3.11 or higher
- Git
- (Optional) Astral `uv` for ultra-fast dependency management

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd road_hazard_ai
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env to add your GEMINI_API_KEY (optional for mock mode)
```

### 3. Run the Platform

#### Option A: Windows (Batch or PowerShell)
```cmd
start.bat
```
or
```powershell
.\start.ps1
```

#### Option B: Linux / macOS
```bash
chmod +x start.sh
./start.sh
```

#### Option C: Standard Python / Pip
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Option D: Docker
```bash
docker-compose up -d
```

### 4. Access the Applications
- 🖥️ **Command Center Dashboard**: [http://localhost:8000/](http://localhost:8000/)
- 📱 **Citizen Mobile Reporting Portal**: [http://localhost:8000/report](http://localhost:8000/report)
- 📖 **Interactive API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🧪 Running Automated Tests

Run the complete 16-test verification suite:

```bash
# Using uv
uv run pytest tests/ -v

# Using standard pytest
pytest tests/ -v
```

---

## 👥 Team Collaboration & Git Workflow

### Pushing this Repository to GitHub / GitLab

```bash
# 1. Add your remote repository
git remote add origin https://github.com/<your-org-or-username>/sadaksuraksha-ai.git

# 2. Rename branch to main if desired
git branch -M main

# 3. Push initial codebase
git push -u origin main
```

### Team Member Specializations
- **Frontend Engineers**: Focus on `frontend/index.html`, `frontend/report.html`, and `frontend/js/app.js`.
- **Backend Engineers**: Focus on `backend/main.py`, `backend/core/`, and `backend/services/`.
- **Database Engineers**: Focus on `database/schema.sql` and `database/seed_data.py`.
- **AI/ML Engineers**: Focus on `backend/core/vision_engine.py` and `backend/core/sensor_fusion.py`.

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for full branch naming conventions and PR guidelines.

---

## 📄 License
This project is licensed under the MIT License.
