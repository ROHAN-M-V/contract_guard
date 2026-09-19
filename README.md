# Contract Guard

> **Post-Award Government Contract Oversight & Compliance Platform**

Contract Guard is a mission-critical decision-support platform engineered for public procurement auditors, oversight commissions, and state comptroller divisions. It tracks post-award contract evolution through:

$$\text{Baseline Tender} \longrightarrow \text{Amendments} \longrightarrow \text{Invoices} \longrightarrow \text{Progress Reports} \longrightarrow \text{Current State}$$

The platform automatically computes and presents cumulative cost drift, schedule slippage, contractor entity novation, semantic scope variance, and ground-truth textual evidence citations to support human auditor determinations.

---

## 1. Important Role Boundary & Principles

### System Role Boundary
- **Platform Layer (Contract Guard - This System)**:
  - Frontend UI, visual analytics, data tables, and evidence viewers
  - RESTful Backend API (FastAPI) & Database persistence (SQLAlchemy, Alembic, PostgreSQL)
   - Local JWT authentication & role-based access control (Auditor / Admin)
   - Document vault with authenticated signed URL/download pipelines (Supabase Storage or local disk)
  - Reviewer determination workflows & certified PDF audit report generation (ReportLab)
  - Clean external adapter interface for Core AI microservice integration
- **Core AI Layer (Local or External Service)**:
   - PDF text extraction with OCR fallback for scanned documents
   - DOCX parsing and image OCR for supported uploads
   - Percentage and cost-drift extraction from document text
   - Sentence-transformer semantic embeddings and scope similarity
   - Weighted risk score and risk-factor calculation
   - Extracted page-level evidence citations
   - Optional external AI microservice through a stable HTTP adapter

### Advisory Terminology Policy
Contract Guard is designed strictly as a **decision-support tool** to empower official procurement auditors. It surfaces objective variances and signals without issuing automated criminal accusations:
- **Approved Terminology**: *"Requires Review"*, *"Risk Signal"*, *"Material Change"*, *"Deviation"*, *"Supporting Evidence"*, *"Under Review"*, *"Escalated"*.
- **Restricted Terminology**: Avoid *"Fraud Detected"*, *"Corrupt Contractor"*, *"Illegal Contract"*.

---

## 2. Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, React Router v6, TanStack Query v5, React Hook Form, Zod, Lucide React, Recharts
- **Backend**: Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, ReportLab (PDF generation)
- **Database**: PostgreSQL / SQLite (for zero-dependency offline local test execution)
- **Authentication**: Local password authentication with signed JWT access tokens and `AUDITOR`/`ADMIN` roles
- **Storage**: Supabase Storage (`contract-documents` bucket) with authenticated local filesystem fallback
- **Document processing**: `pypdf`, `pdf2image`, Poppler, Tesseract, `python-docx`, Pillow, and `pytesseract`
- **AI analysis**: Local extraction, embedding, and risk pipeline with optional external HTTP service
- **Testing**: Vitest & React Testing Library (Frontend), Pytest & HTTPX (Backend)
- **Containers**: Docker & Docker Compose

---

## 3. Monorepo Directory Structure

```
contract-guard/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/               # Button, Badge, Card, Modal, Input, Select, Tabs, etc.
│   │   │   ├── layout/           # Sidebar, Topbar
│   │   │   ├── dashboard/        # SummaryCards, PriorityQueueTable, RecentActivityFeed
│   │   │   ├── contracts/        # ContractTable, ContractModal, ReviewModal
│   │   │   ├── documents/        # DocumentList
│   │   │   ├── timeline/         # ContractTimeline, DriftChart (Recharts)
│   │   │   ├── risk/             # RiskScoreCard, RiskFactorsList
│   │   │   └── evidence/         # EvidencePanel
│   │   ├── layouts/              # AppLayout, AuthLayout
│   │   ├── pages/                # LoginPage, Dashboard, Contracts, Detail, Upload, Alerts, Reports, Settings
│   │   ├── services/             # auth, contracts, documents, reviews, alerts, reports
│   │   ├── types/                # contract, document, change, risk, evidence, review
│   │   ├── lib/                  # api.ts (client), utils.ts, constants.ts
│   │   ├── test/                 # Vitest test suite
│   │   ├── router/index.tsx
│   │   ├── App.tsx & main.tsx
│   ├── package.json, vite.config.ts, tsconfig.json, tailwind.config.js
│   └── .env.example
├── backend/
│   ├── AI-features/             # Extraction, OCR, embeddings, prompts, risk, local pipeline
│   ├── app/
│   │   ├── api/
│   │   │   ├── dependencies.py   # Auth & auditor role verification
│   │   │   └── routes/           # auth, contracts, documents, versions, changes, risk, reviews, alerts, reports, analysis
│   │   ├── core/                 # config, security, logging
│   │   ├── database/
│   │   │   ├── session.py, base.py, seed_data.py
│   │   │   └── models/           # Profile, Contract, Document, ContractVersion, Change, RiskScore, ReviewDecision, Alert
│   │   ├── schemas/              # Pydantic models & Shared AI Result Contract
│   │   └── services/
│   │       ├── storage/          # Supabase Storage client
│   │       ├── reports/          # ReportLab PDF generator
│   │       └── analysis/         # ai_client.py (MockAIAnalysisClient & HttpAIAnalysisClient)
│   ├── alembic/                  # Database migration versions
│   ├── tests/                    # Pytest test suite
│   ├── requirements.txt
│   ├── Dockerfile                # Includes Poppler and Tesseract for OCR
│   └── .env.example
├── supabase/
│   ├── migrations/               # PostgreSQL schema & Row-Level Security
│   └── seed.sql                  # Synthetic database seed data
├── data/demo/                    # Synthetic contracts JSON dataset
├── docs/architecture.md          # In-depth architectural design
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 4. Prerequisites

- **Node.js**: v18+ (Tested on v20 and v24)
- **npm**: v9+
- **Python**: 3.12+ (Tested on Python 3.14)
- **pip**: Python package manager
- *(Optional)* Docker & Docker Compose
- *(Optional)* Supabase project account (A self-contained mock mode is included so Supabase is not strictly required for evaluation)

---

## 5. Environment Configuration

### Backend (`backend/.env` or environment variables)
Copy `backend/.env.example` to `backend/.env`:
```bash
PROJECT_NAME="Contract Guard"
API_V1_STR="/api/v1"
DATABASE_URL="sqlite:///./contract_guard.db" # Or postgresql+psycopg2://postgres:postgres@localhost:5432/contract_guard

# Supabase configuration (Optional; system falls back gracefully to local storage & auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=contract-documents

# AI Service Integration
USE_MOCK_AI=true
AI_ANALYSIS_SERVICE_URL=http://localhost:8001
AI_MODEL_API_KEY=                 # Optional bearer credential for an external AI service

# Registration is disabled by default; enable only for a controlled deployment
ALLOW_PUBLIC_REGISTRATION=false

# Security
SECRET_KEY=contract-guard-super-secret-key-change-in-production-2026
```

### Frontend (`frontend/.env` or environment variables)
Copy `frontend/.env.example` to `frontend/.env`:
```bash
VITE_API_URL=http://localhost:8000/api/v1
VITE_DEMO_MODE=true               # Shows a warning when synthetic/mock data is enabled
```

---

## 6. Installation & Running Locally

### Step 1: Start the Backend Server
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run database migrations (optional, tables are automatically initialized and seeded on startup)
alembic upgrade head

# Start FastAPI dev server on port 8000
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend will automatically start, initialize the database tables, and seed **8 realistic synthetic government contracts** (with `PWD-2026-014` fully populated).
- Swagger Interactive Documentation: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/v1/health`

### Step 2: Start the Frontend Application
In a separate terminal:
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

### Docker Compose

To run the database, backend, and frontend together:

```bash
docker compose up --build
```

The frontend is available at `http://localhost:3000` and the backend API at `http://localhost:8000` when using the compose configuration.

---

## 7. Demo Credentials & Quick Access

Contract Guard provides pre-configured internal audit accounts for rapid evaluation. On the `/login` page, you can use the one-click credential buttons or enter:

| Role | Email | Password | Department |
|---|---|---|---|
| **Lead Auditor** | `auditor@contractguard.gov` | `AuditGuard2026!` | Public Works Oversight Division |
| **System Admin** | `admin@contractguard.gov` | `AdminGuard2026!` | Central Procurement Audit Bureau |

---

## 8. Verification & Acceptance Journey

To test the complete end-to-end audit lifecycle:

1. **Sign In**: Navigate to `http://localhost:5173/login` and click **Lead Auditor** quick sign-in.
2. **Dashboard Overview**: View top cards: `TOTAL CONTRACTS (8)`, `REQUIRES REVIEW`, `HIGH RISK`, `CRITICAL (1)`.
3. **Inspect Flagship Contract**: Click on `PWD-2026-014` in the Priority Review Queue:
   - **Baseline vs Current**: See **₹10.0 Cr → ₹14.1 Cr (+41%)**.
   - **Risk Gauge**: See **87 / 100 CRITICAL**.
   - **Schedule Variance**: See **December 2026 → August 2027 (+8 months)**.
4. **Inspect Risk Factors & Evidence**:
   - In the *Overview & Signals* tab, click on **Cost deviation**.
   - The UI automatically switches to the **Ground-Truth Evidence** panel, highlighting:
     - `contract.pdf` (Page 12): Clause 4.1 establishing original ₹10 Cr consideration.
     - `amendment_4.pdf` (Page 4): Addendum B establishing revised ₹14.1 Cr consideration.
5. **Timeline & Recharts Drift Curve**: Switch to the **Version Timeline & Drift** tab to see:
   - Recharts visual valuation progression curve vs baseline reference line.
   - Chronological card chain: Baseline → Amendment 1 (+8%) → Amendment 2 → Amendment 3 (Novation) → Amendment 4 (+41%).
6. **Upload a New Amendment**:
   - Navigate to `/upload` or click *Upload Addenda*.
   - Select `PWD-2026-014`, choose document type `AMENDMENT`, and attach any PDF.
   - Click **Upload & Trigger AI Analysis**.
   - Watch the 6-step real-time pipeline progress:
     1. Document uploaded & validated
     2. Extracting clauses & terms
     3. Comparing against baseline specs
     4. Updating cumulative drift models
     5. Calculating risk factors & weights
     6. Analysis complete & persisted
7. **Submit Auditor Determination**:
   - Click **Submit Determination**.
   - Select **ESCALATED**, provide regulatory notes (e.g. *"Cumulative cost drift of +41% exceeds standard threshold; escalated to legislative PAC."*), and submit.
   - Notice the contract status updates to `ESCALATED` and a priority alert is emitted.
8. **Generate Official PDF Audit Dossier**:
   - Click **Generate PDF Report**.
   - The system calls the backend ReportLab engine and downloads `Contract_Guard_Report_PWD-2026-014.pdf`, containing all contract identifiers, risk factors, timeline progression, changes, evidence quotes, and reviewer determination.

### Frontend Functionality

- **Dashboard**: Shows contract totals, risk distribution, review priorities, alerts, and recent activity.
- **Contracts**: Search, filter, sort, create, edit, archive, and open contracts within the user's authorized department or ownership scope.
- **Contract details**: Displays baseline/current values, schedule drift, risk score, risk factors, document history, version timeline, evidence, alerts, and review decisions.
- **Document upload**: Associates a document with a contract, assigns the next server-owned revision, and triggers analysis.
- **Analysis**: Shows cost deviation, scope similarity, document cadence, risk level, extracted evidence, and persisted changes.
- **Alerts**: Lists high and critical risk signals and supports unread-alert workflows.
- **Reports**: Generates downloadable PDF audit dossiers.
- **Settings and account**: Provides authenticated profile and application settings views.

### Supported Upload Formats

The backend supports PDF text extraction with OCR fallback, DOCX paragraph extraction, and PNG/JPG/JPEG image OCR. Legacy `.doc` files are not parsed and should be converted to DOCX or PDF before upload. Docker installs Poppler and Tesseract for OCR; local development should install those system packages separately when OCR is required.

---

## 9. Testing & Quality Checks

### Run Backend Tests (Pytest)
```bash
cd backend
python -m pytest tests -v
```
**Test Results**:
```
tests/test_analysis_adapter.py::test_mock_ai_analysis_client_direct PASSED
tests/test_analysis_adapter.py::test_analyze_endpoint PASSED
tests/test_contracts.py::test_list_contracts PASSED
tests/test_contracts.py::test_get_flagship_contract PASSED
tests/test_contracts.py::test_create_and_delete_contract PASSED
tests/test_documents.py::test_list_and_upload_documents PASSED
tests/test_reviews.py::test_create_and_list_reviews PASSED
tests/test_versions.py::test_list_versions PASSED
================ 8 passed in 1.67s ================
```

### Run Frontend Tests (Vitest)
```bash
cd frontend
npm test
```
**Test Results**:
```
 ✓ src/test/contract_guard.test.tsx (5 tests)
   ✓ renders critical integration test: ₹10 Cr -> ₹14.1 Cr and displays +41% with CRITICAL 87 risk score
   ✓ renders Dashboard summary cards correctly
   ✓ renders Priority Review Queue sorted by risk descending
   ✓ renders AI risk factors and triggers evidence selection callback
   ✓ renders ground-truth evidence citations accurately

Test Files  1 passed (1)
     Tests  5 passed (5)
```

### Run Frontend Typecheck & Build
```bash
cd frontend
npm run lint   # tsc --noEmit
npm run build  # Production Vite build
```

The backend test suite covers authentication, contract access, uploads, revisions, analysis adapters, reviews, and versions. The frontend suite covers dashboard rendering, contract risk summaries, AI risk factors, and evidence selection.

---

## 10. AI Features & Microservice Integration

### Local AI pipeline

When `USE_MOCK_AI=true`, analysis still uses the local document pipeline for uploaded contracts. It:

1. Resolves local or Supabase-backed document content.
2. Extracts text from PDF, DOCX, and supported image files.
3. Uses OCR for scanned PDFs and images when the required system tools are available.
4. Detects percentage-based cost variance from amendment text.
5. Embeds baseline and amendment text and calculates cosine scope similarity.
6. Calculates weighted cost, scope, and document-cadence risk factors.
7. Returns extracted page-level evidence and persists risk, change, timeline, and alert records.

The local pipeline is deterministic and intended for development, demonstrations, and offline execution. It is not a substitute for production model validation or auditor judgment.

### External AI microservice

When connecting the Core AI Engineer's external microservice:
1. Update `backend/.env`:
   ```bash
   USE_MOCK_AI=false
   AI_ANALYSIS_SERVICE_URL=http://your-ai-service:8001
   ```
2. The platform's `HttpAIAnalysisClient` in `backend/app/services/analysis/ai_client.py` will issue `POST /analyze` requests passing:
   ```json
   {
     "contract_id": "PWD-2026-014",
     "documents": [ ... ],
     "metadata": { ... }
   }
   ```
3. The AI service responds with the **Shared AI Result Contract** (Drift, Risk, Factors, Changes, Timeline, Evidence), which the backend automatically ingests into the relational database.

The optional `AI_MODEL_API_KEY` is sent as a bearer credential to the configured external service. Keep this value on the backend and never expose it through frontend environment variables.

---

## 11. Security, Data Integrity & Limitations

- Every protected API route requires a valid JWT.
- Admin users can access all contracts; other users are limited to contracts they created or contracts in their department.
- Registration is disabled by default. Set `ALLOW_PUBLIC_REGISTRATION=true` only for a controlled deployment with an appropriate onboarding policy.
- Document downloads require authentication and are restricted to paths inside the configured storage directory.
- Document revisions are assigned by the backend. Baseline documents use revision `0`, and the database enforces unique `(contract_id, version_number)` pairs.
- Apply `alembic upgrade head` when deploying the revision-integrity migration.

- **Synthetic Demo Data**: All demo contracts and vendor names are synthetic simulations created for procurement auditing demonstration.
- **Mock Analysis**: The flagship seeded contract has deterministic demo analysis; newly uploaded contracts use the local extraction pipeline when mock mode is enabled.
- **OCR Dependencies**: OCR requires Poppler and Tesseract. If unavailable, extraction returns a controlled empty result rather than treating binary files as text.
- **Local Fallback**: If external Supabase Storage or PostgreSQL credentials are not supplied, the platform uses SQLite and local disk storage for development.
