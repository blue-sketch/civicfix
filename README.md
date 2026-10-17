# 🏛️ Civic Fix — Intelligent Municipal Grievance & Urban Operations Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![PostGIS](https://img.shields.io/badge/PostGIS-3.4%20(PostgreSQL%2016)-336791.svg?style=flat&logo=postgresql)](https://postgis.net/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Pytest-10%2F10%20Passing-brightgreen.svg?style=flat&logo=pytest)](https://docs.pytest.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Civic Fix** is a production-grade, full-stack civic operations platform bridging citizens, municipal officers, field crews, and urban administrators through spatial intelligence, explainable mathematical prioritization, automated duplicate detection, and interactive patrol route planning.

---

## 📌 Executive Summary & Problem Statement

Modern municipal grievance redressal systems suffer from four critical operational bottlenecks:
1. **Duplicate Flood**: When a major road pothole or water main bursts on an arterial street, dozens of citizens file duplicate complaints, overwhelming municipal call centers and splitting work orders.
2. **Subjective Prioritization**: Complaints are handled on a First-In-First-Out (FIFO) basis or political pressure, leaving dangerous electrical hazards and sewage overflows unattended while minor aesthetic issues get resolved.
3. **Black-Hole Citizen Experience**: Citizens receive automated SMS notifications saying *"In Progress"* without photographic evidence, geographical context, or clear timelines, leading to repeated grievances.
4. **Inefficient Field Dispatch**: Field repair crews receive disconnected task lists with no spatial route planning, zig-zagging across the city and wasting fuel, time, and materials.

**Civic Fix** solves these systemic problems through a unified geospatial command platform centered on **Pune Municipal Corporation (PMC)**, featuring an explainable mathematical priority scoring engine, PostGIS spatial duplicate clustering, and interactive patrol route planning.

---

## 🌟 Key Platform Innovations

```
                               ┌────────────────────────────────┐
                               │   CITIZEN REPORTING PORTAL     │
                               │  - 4-Step Grievance Wizard     │
                               │  - Geo-Pinpoint Leaflet Map    │
                               │  - Multi-Photo Upload Evidence │
                               └──────────────┬─────────────────┘
                                              │ REST API
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               CIVIC FIX BACKEND ENGINE                                 │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌──────────────────────────┐  │
│  │  Deterministic Priority│  │   PostGIS Spatial      │  │ Strict Workflow Machine  │  │
│  │  Scoring Engine        │  │   Duplicate Detector   │  │ (Audit Trail & Logging)  │  │
│  │  0.35S+0.30I+0.25A+0.10C│  │   ST_DWithin <= 80m    │  │ REPORTED->ASSIGNED->DONE │  │
│  └────────────────────────┘  └────────────────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────┬──────────────────────────────────────────┘
                                              │
                    ┌─────────────────────────┴────────────────────────┐
                    ▼                                                  ▼
┌───────────────────────────────────────┐  ┌──────────────────────────────────────┐
│       MUNICIPAL COMMAND DESK          │  │       FIELD OPERATIONS DESK          │
│  - Operations Overview & Live KPIs    │  │  - Dispatch & Work Orders Queue      │
│  - Interactive Leaflet Dossier Map    │  │  - Resolution Technical Notes        │
│  - Custom Route Inspection Planner    │  │  - Mandatory Photographic Proof      │
│  - Duplicate Merge & Triage           │  │  - One-Click Status Transitions      │
└───────────────────────────────────────┘  └──────────────────────────────────────┘
```

### 1. 🧮 Explainable Priority Scoring Engine
Rather than relying on opaque black-box scoring, Civic Fix uses a transparent, explainable formula calculated on every ticket:

$$\text{Priority Score} = 0.35 \times \text{Severity} + 0.30 \times \text{Impact} + 0.25 \times \text{Age} + 0.10 \times \text{Corroboration}$$

- **Severity (0–100)**: Intrinsic hazard level (Low: 25, Medium: 50, High: 75, Critical: 100).
- **Impact (0–100)**: Population exposure score based on road arterial hierarchy, school/hospital zones, and traffic density.
- **Age (0–100)**: Time elapsed relative to department SLA threshold ($\min(100, \frac{\text{hours}}{72} \times 100)$).
- **Corroboration (0–100)**: Upvotes and confirmed duplicate reports ($\min(100, \text{count} \times 15)$).
- **🚨 Emergency Override**: Hazardous gas leaks, live exposed cables, and major sinkholes trigger an automatic override:
  $$\text{Priority} = \max(95.0, \text{Score}), \quad \text{is\_emergency} = \text{true}$$

### 2. 🗺️ PostGIS Geospatial Duplicate Detection
- Runs an indexed spatial proximity query via GeoAlchemy2 / PostGIS:
  `ST_DWithin(Issue.location, :new_geom, 80.0)` (80-meter radius).
- Filters for matching grievance categories (e.g., Road vs Road, Water vs Water).
- Computes text token Jaccard similarity across descriptions.
- Officers can merge duplicate tickets into the canonical master record with 1 click, instantly boosting the master issue's corroboration weight.

### 3. 🛣️ Interactive "Mark Custom Route" Planner
- Officers can activate the **Mark Route Tool** directly on the Pune Leaflet map.
- Click waypoints across wards to generate an inspection sequence with live distance calculations.
- Save named routes (e.g., *"FC Road & Deccan Monsoon Inspection Loop"*) to the backend registry for field workers to patrol.

### 4. 🔄 Strict Role-Based Workflow Machine
- Enforces valid state transitions:
  `REPORTED` → `VERIFIED` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED` → `CLOSED` (or `REOPENED`).
- Prevents unauthorized transitions (e.g., cannot jump from `REPORTED` directly to `RESOLVED`).
- Mandatory post-repair photographic proof and technician sign-off required for resolution.
- Comprehensive audit trail records every timestamp, user ID, previous status, and new status.

---

## 👥 1-Click Demonstration Accounts

For hackathon judges and evaluators, Civic Fix includes instant **1-Click Demo Persona Switching** directly in the top navigation bar. Password for all accounts is **`CivicFix2026!`**:

| Persona | Demo Email | Role | Core Capabilities in UI |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@civicfix.org` | `CITIZEN` | Submit geo-tagged reports with photos, track "My Complaints" timeline, submit reopen requests |
| **Municipal Officer** | `officer@civicfix.org` | `OFFICER` | Interactive Live Map, left dossier triage, duplicate confirmation, team dispatch, route planner |
| **Field Worker** | `worker@civicfix.org` | `WORKER` | Mobile-friendly assigned task queue, progress updater, post-repair photo evidence upload |
| **Administrator** | `admin@civicfix.org` | `ADMIN` | Executive KPI dashboard, SLA compliance metrics, ward velocity charts, department configuration |

---

## 🏙️ Demonstration Dataset (Pune, India)

Civic Fix includes a pre-seeded, realistic dataset of **35 municipal grievances** across 6 key administrative wards in Pune:
- **Shivajinagar** (FC Road, JM Road, Engineering College junction)
- **Kothrud** (Paud Road, Karve Statue, MIT College area)
- **Hadapsar** (Magarpatta South Gate, Gadital bus depot)
- **Viman Nagar** (Symbiosis Road, Datta Mandir Chowk)
- **Kasba Peth** (Shaniwar Wada perimeter, Phadke Haud)
- **Aundh** (Bremen Chowk, Parihar Chowk)

Includes pre-linked duplicate pairs, urgent priority overrides, and historical resolved records.

---

## 💻 Tech Stack Architecture

### Frontend
- **Framework**: React 18 with TypeScript & Vite
- **Styling**: Tailwind CSS with dark navy operational aesthetic (`#171B35`)
- **Mapping**: Leaflet & React-Leaflet with OpenStreetMap tiles (100% free, no API keys required)
- **Data Visualizations**: Recharts (category donuts, status pipeline, velocity area charts)
- **State & Routing**: TanStack Query v5, React Router v6, Context API

### Backend
- **Framework**: FastAPI (Python 3.13 / 3.11+)
- **ORM & Database**: SQLAlchemy 2.0 with GeoAlchemy2 (PostGIS spatial geometry)
- **Security & Auth**: JWT (JSON Web Tokens) with Argon2/Bcrypt password hashing
- **Validation**: Pydantic v2 schemas with strict type hints
- **Testing**: Pytest with HTTPX test client

### Database & Infrastructure
- **Spatial DB**: PostgreSQL 16 with PostGIS 3.4 (`postgis/postgis:16-3.4-alpine`)
- **Port Mapping**: Host port `5433` -> Container `5432` (avoids local Postgres port conflicts)
- **Containerization**: Multi-service `docker-compose.yml`

---

## 🚀 Quick Start Guide

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Python 3.11+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/)

### 1. Clone & Start PostGIS Database
```bash
git clone https://github.com/blue-sketch/civicfix.git
cd civicfix

# Start PostGIS container
docker compose up -d db
```

### 2. Backend Setup & Seeding
```bash
cd backend
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS / Linux:
# source venv/bin/activate

pip install -r requirements.txt

# Run seed script (creates demo accounts, wards, teams, and 35 sample issues):
python -m app.db.seed

# Start FastAPI server on port 8000:
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*API Swagger Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)*

### 3. Frontend Setup & Launch
```bash
cd ../frontend
npm install --legacy-peer-deps
npm run dev -- --host 127.0.0.1 --port 5173
```
*Open application in browser: [http://127.0.0.1:5173](http://127.0.0.1:5173)*

---

## 🧪 Automated Test Suite

Civic Fix includes a comprehensive test suite validating all core business logic:

```bash
cd backend
pytest -v
```

### Test Coverage Highlights:
- ✅ `test_health`: Health check API verification
- ✅ `test_auth_tokens`: JWT generation and role claims validation
- ✅ `test_rbac_protection`: Unauthorized access rejection across roles
- ✅ `test_priority_calculation`: Deterministic formula accuracy and bounds
- ✅ `test_emergency_override`: Emergency priority escalation logic
- ✅ `test_duplicate_detection_logic`: PostGIS 80m spatial radius & Jaccard matching
- ✅ `test_issue_lifecycle_workflow`: State machine transitions (`REPORTED` → `RESOLVED`)
- ✅ `test_invalid_state_transition`: Rejection of illegal workflow jumps
- ✅ `test_citizen_isolation`: Data privacy and complaint isolation
- ✅ `test_analytics_aggregation`: Ward, department, and SLA metrics calculation

**Result: 10 of 10 tests passing (100%).**

---

## 🎯 5-Minute Hackathon Demo Script for Judges

1. **Operations Overview**: Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Observe the dark navy dashboard, real-time KPI metrics, Recharts category donut, and the Top 5 Urgent Priority Queue.
2. **Live Map & Left Dossier**: Click **Live Issue Map**. Click any map pin across Pune (e.g., FC Road pothole). Examine the collapsible left drawer with its 5 tabs: **Info & Scoring** (showing the exact math breakdown), **Timeline**, **Comments**, **Photos**, and **Duplicates**.
3. **Route Planning**: On the Live Map, click **Mark Custom Route**. Click 3 waypoints on the map, view the real-time calculated distance, name the route (*"Monsoon Pothole Sweep"*), and save it.
4. **Citizen Grievance Submission**: In the top header, click the **Citizen** persona button. Go to **Report Issue**. Complete the 4-step wizard: select category, drop a pin on the map, upload an image, and submit. Note the generated Ticket ID.
5. **Officer Triage & Dispatch**: Switch to the **Officer** persona. Go to **Issue Registry** or **Live Map**. Locate the newly submitted issue, click **Verify Issue**, and assign it to *"Road Rapid Patch Unit #1"*.
6. **Field Worker Resolution**: Switch to the **Worker** persona. Go to **My Assignments**. Advance the status to **In Progress**, then click **Complete Resolution**, enter field completion notes, upload an after-repair photo, and submit.
7. **Resolution Verified**: Switch back to **Citizen** → **My Complaints**. Confirm the timeline displays `RESOLVED` with the technician's photographic evidence.

---

## 📂 Repository Structure

```
civicfixhack/
├── .env.example              # Environment variables template
├── .gitignore                # Comprehensive Git ignore rules
├── README.md                 # Complete documentation & hackathon guide
├── docker-compose.yml        # Docker compose configuration (PostGIS)
├── backend/
│   ├── Dockerfile            # Container build configuration
│   ├── pytest.ini           # Pytest test configuration
│   ├── requirements.txt      # Python dependencies
│   ├── app/
│   │   ├── api/              # REST API routes (auth, issues, analytics, routes)
│   │   ├── core/             # Configuration & JWT security
│   │   ├── db/               # SQLAlchemy session & seed script
│   │   ├── models/           # PostGIS GeoAlchemy2 models
│   │   ├── schemas/          # Pydantic v2 schemas
│   │   ├── services/         # Priority engine, duplicate detector, workflow
│   │   └── uploads/          # Static file uploads storage
│   └── tests/                # Automated backend test suite
└── frontend/
    ├── Dockerfile            # Frontend container configuration
    ├── package.json          # Frontend dependencies & scripts
    ├── tailwind.config.js    # Tailwind configuration
    ├── vite.config.ts        # Vite configuration with API proxy
    └── src/
        ├── components/       # Layout shell, modals, navbar
        ├── context/          # Auth context with 1-click persona switcher
        ├── pages/            # 8 core views (Overview, Map, Wizard, Registry, etc.)
        ├── services/         # Axios API client
        └── types/            # TypeScript data definitions
```

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
