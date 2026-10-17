# 🏛️ Civic Fix

**Intelligent Municipal Grievance & Urban Operations Platform**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![PostGIS](https://img.shields.io/badge/PostGIS-3.4%20(PostgreSQL%2016)-336791.svg?style=flat&logo=postgresql)](https://postgis.net/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Pytest-10%2F10%20Passing-brightgreen.svg?style=flat&logo=pytest)](https://docs.pytest.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> 🔗 **Live App**:https://hackathoncivicfix.netlify.app <!-- Replace with your Netlify URL -->
>
> 🎬 **Demo Video**: _Coming soon_ <!-- Replace with your video link -->

---

## 📋 Problem Statement

Citizens often struggle to report local civic issues, find the appropriate authorities, and track whether their complaints have been resolved. Municipal bodies receive hundreds of complaints daily through disconnected channels — phone calls, in-person visits, social media — leading to:

- **Duplicate overload**: A single broken water main generates dozens of separate complaints, splitting work orders and confusing dispatchers.
- **No prioritization**: Complaints are handled first-come-first-served or by political pressure, leaving dangerous hazards unattended while minor cosmetic issues get resolved.
- **Zero transparency**: Citizens receive vague "In Progress" updates without photographic proof, location context, or clear timelines — eroding public trust.
- **Inefficient field operations**: Repair crews receive disconnected task lists with no spatial planning, zig-zagging across the city wasting fuel, time, and resources.

---

## 💡 Solution

**Civic Fix** is a centralized platform where citizens can report problems such as potholes, water leaks, overflowing garbage, and broken streetlights, while responsible municipal teams can manage complaints and provide resolution updates — all with full transparency and accountability.

Built around **Pune Municipal Corporation (PMC)** as a demo, the platform features:

- A **citizen portal** for geo-tagged, photo-evidenced issue reporting with real-time status tracking
- An **officer dashboard** with department-scoped work queues, issue verification, and resolution workflows
- An **admin command center** with city-wide analytics, officer management, and operational oversight
- An **explainable priority scoring engine** that mathematically ranks issues by severity, impact, age, and community corroboration
- **PostGIS spatial intelligence** for duplicate detection, live map visualization, and patrol route planning

---

## ✨ Features

### For Citizens
- 📝 **4-Step Issue Reporting Wizard** — Select category, drop a pin on the map, upload evidence photos, and submit
- 📍 **Geo-Pinpoint Location** — Interactive Leaflet map for precise issue location marking
- 📷 **Photo Evidence Upload** — Attach multiple photos with a zoomable lightbox viewer
- 📊 **Personal Dashboard** — Track all submitted complaints with live status updates
- 🔔 **In-App Notifications** — Get notified when issues are verified, assigned, or resolved
- 🔄 **Reopen Requests** — Request reopening if a resolution is unsatisfactory

### For Municipal Officers
- 🗺️ **Live Issue Map** — Interactive Pune map with color-coded severity markers and click-to-inspect dossiers
- ✅ **Issue Verification & Triage** — Verify citizen reports, confirm duplicates, and assign to teams
- 📋 **Department-Scoped Work Queue** — View only issues assigned to your department
- 🔧 **Resolution Workflow** — Advance issues through `IN_PROGRESS` → `RESOLVED` → `CERTIFIED` with mandatory photo proof
- 🛣️ **Custom Route Planner** — Mark inspection waypoints on the map, calculate distances, and save named patrol routes

### For Admins
- 📈 **Executive Analytics Dashboard** — KPI cards, category distribution donuts, status pipeline, ward velocity charts
- 👥 **Officer Department Management** — Assign/reassign officers to departments with full audit trail
- 🏢 **Cross-Department Oversight** — View all issues, all departments, all wards in one place
- 🔍 **Verify & Dispatch Console** — Triage incoming complaints, assign teams, and monitor resolution

### Platform-Wide
- 🧮 **Explainable Priority Scoring** — Transparent formula: `0.35×Severity + 0.30×Impact + 0.25×Age + 0.10×Corroboration` with emergency overrides
- 🗺️ **PostGIS Duplicate Detection** — 80-meter spatial radius + category matching + text similarity
- 🔐 **Role-Based Access Control** — Three roles (Citizen, Officer, Admin) with strict route guards and API authorization
- 🔄 **Strict Workflow State Machine** — Enforced transitions: `SUBMITTED` → `VERIFIED` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED` → `CERTIFIED` → `CLOSED`
- 📱 **Responsive Design** — Works on desktop, tablet, and mobile

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | Component-based UI with type safety |
| **Build Tool** | Vite 5 | Lightning-fast HMR and optimized production builds |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS with dark navy operational aesthetic |
| **Mapping** | Leaflet + React-Leaflet | Interactive maps with OpenStreetMap tiles (no API key needed) |
| **Charts** | Recharts | Category donuts, status pipelines, velocity area charts |
| **State Management** | TanStack Query v5 + React Context | Server state caching, auto-refetching, auth context |
| **Routing** | React Router v6 | Client-side routing with role-based guards |
| **Backend** | FastAPI (Python) | High-performance async REST API with auto-generated docs |
| **ORM** | SQLAlchemy 2.0 + GeoAlchemy2 | Spatial-aware database operations with PostGIS |
| **Database** | PostgreSQL 16 + PostGIS 3.4 | Relational DB with geospatial indexing and queries |
| **Auth** | JWT + Bcrypt | Stateless authentication with secure password hashing |
| **Validation** | Pydantic v2 | Runtime data validation with strict type hints |
| **Testing** | Pytest + HTTPX | Automated backend test suite (10/10 passing) |
| **Deployment** | Netlify + Render + Neon DB | Free-tier cloud hosting with managed PostgreSQL |

### Why This Stack?

- **FastAPI + React**: FastAPI gives us automatic OpenAPI docs, async support, and Pydantic validation out of the box. React with TypeScript catches bugs at compile time and enables a rich interactive UI.
- **PostGIS over plain PostgreSQL**: Civic issues are inherently spatial. PostGIS enables `ST_DWithin` spatial queries for duplicate detection, map clustering, and distance-based routing — something no NoSQL or plain SQL database can do efficiently.
- **Leaflet over Google Maps/Mapbox**: 100% free, no API keys, no billing surprises. OpenStreetMap tiles are especially detailed for Indian cities like Pune.
- **Tailwind CSS**: Rapid prototyping with consistent design tokens. The utility-first approach eliminated the need for a separate component library while maintaining a polished, professional UI.
- **TanStack Query**: Automatic cache invalidation, background refetching, and optimistic updates mean the UI always feels responsive without manual state management boilerplate.
- **Vite over CRA/Webpack**: Sub-second HMR during development and tree-shaken production builds. The frontend builds in ~24 seconds with a 930 KB JS bundle.
- **Neon DB for deployment**: Serverless PostgreSQL with native PostGIS support on the free tier — perfect for hackathon demos without managing infrastructure.

---

## 🚀 Setup & Usage

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostGIS database)
- [Python 3.11+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/)

### 1. Clone & Start Database

```bash
git clone https://github.com/blue-sketch/civicfix.git
cd civicfix

# Start PostGIS container (PostgreSQL 16 + PostGIS 3.4)
docker compose up -d db
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS / Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed database with demo data (35 issues, 6 wards, 4 departments, 5 users)
python -m app.db.seed

# Start FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

📄 API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3. Frontend Setup

```bash
cd ../frontend
npm install --legacy-peer-deps
npm run dev -- --host 127.0.0.1 --port 5173
```

🌐 Open App: [http://127.0.0.1:5173](http://127.0.0.1:5173)

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| **Citizen** | `citizen@civicfix.org` | `CivicFix2026!` |
| **Officer** | `officer@civicfix.org` | `CivicFix2026!` |
| **Admin** | `admin@civicfix.org` | `CivicFix2026!` |

---

## 🧪 Running Tests

```bash
cd backend
pytest -v
```

**Result: 10/10 tests passing ✅**

| Test | Description |
|------|-------------|
| `test_health` | Health check API verification |
| `test_auth_tokens` | JWT generation and role claims |
| `test_rbac_protection` | Unauthorized access rejection |
| `test_priority_calculation` | Priority formula accuracy |
| `test_emergency_override` | Emergency escalation logic |
| `test_duplicate_detection_logic` | PostGIS 80m spatial matching |
| `test_issue_lifecycle_workflow` | State machine transitions |
| `test_invalid_state_transition` | Illegal workflow rejection |
| `test_citizen_isolation` | Complaint data privacy |
| `test_analytics_aggregation` | Ward & department metrics |

---

## 📂 Project Structure

```
civicfix/
├── docker-compose.yml              # PostGIS database container
├── backend/
│   ├── requirements.txt            # Python dependencies
│   └── app/
│       ├── main.py                 # FastAPI application entry point
│       ├── api/                    # REST endpoints (auth, issues, analytics, teams, users)
│       ├── core/                   # Configuration & JWT security
│       ├── db/                     # SQLAlchemy session & seed script
│       ├── models/                 # PostGIS/GeoAlchemy2 ORM models
│       ├── schemas/                # Pydantic v2 request/response schemas
│       ├── services/               # Priority engine, duplicate detector, workflow
│       └── uploads/                # User-uploaded evidence photos
└── frontend/
    ├── package.json                # Node.js dependencies & build scripts
    ├── vite.config.ts              # Vite config with API proxy
    ├── public/_redirects           # Netlify deployment proxy rules
    └── src/
        ├── App.tsx                 # Root router with role-based guards
        ├── components/             # Shell layout, ImageLightbox, shared UI
        ├── context/                # AuthContext (JWT + role management)
        ├── pages/                  # All page views
        │   ├── LandingPage.tsx     # Public landing page
        │   ├── LoginPage.tsx       # Authentication page
        │   ├── CitizenOverview.tsx  # Citizen personal dashboard
        │   ├── OverviewPage.tsx     # Officer/Admin operations dashboard
        │   ├── LiveMapPage.tsx      # Interactive Pune issue map
        │   ├── AssignmentsPage.tsx  # Role-specific work queues
        │   ├── MyComplaintsPage.tsx # Citizen complaint tracker
        │   ├── AnalyticsPage.tsx    # Executive analytics
        │   └── OfficerManagementPage.tsx  # Admin officer management
        ├── services/api.ts         # API client (fetch-based)
        └── types/index.ts          # TypeScript type definitions
```

---

## 👥 Team Members

| Name | Role |
|------|------|
| **Neel Naik** | Full-Stack Development |
| **Manish Divate** | Full-Stack Development |
| **Tejas Retharekar** | Full-Stack Development |
| **Ajinkya Moharir** | Deployment |

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| 🌐 **Live App** | _Coming soon_ <!-- Replace with Netlify URL --> |
| 🎬 **Demo Video** | _Coming soon_ <!-- Replace with video link --> |
| 📦 **Repository** | [github.com/blue-sketch/civicfix](https://github.com/blue-sketch/civicfix) |
| 📄 **API Docs** | `/docs` endpoint on the backend |

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
