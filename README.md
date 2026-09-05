# One Acre Fund Nigeria — Offline-First Farmer Registration & Admin Suite
> **Farmers First | Tech Specialist R1 Exercise Prototype**

An offline-first web application prototype designed for One Acre Fund Field Officers working in rural Nigerian communities with intermittent or zero internet connectivity. The system allows field officers to capture farmer information offline with instant local validation, ensures 100% data preservation via IndexedDB, and synchronizes seamlessly to a central Neon PostgreSQL database when connectivity becomes available.

---

## Architecture Overview

```
                      [ Field Officer in Rural Nigeria ]
                                       │
                      (No Internet / Zero Signal Zone)
                                       │
                                       ▼
                       ┌──────────────────────────────┐
                       │  Client-Side Web Application │
                       │    (Next.js App Router)      │
                       └──────────────┬───────────────┘
                                      │
                         Dexie.js IndexedDB Engine
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
    ┌───────────────────┐                           ┌───────────────────┐
    │  Offline Location │                           │  Farmer Records   │
    │  Cache (State,    │                           │  Storage (Status: │
    │  LGA, Village PU) │                           │  Pending/Synced)  │
    └───────────────────┘                           └─────────┬─────────┘
                                                              │
                       [ Internet Connection Resumes ]         │
                               (or 30s Heartbeat)             │
                                       │                      │
                                       ▼                      ▼
                       ┌──────────────────────────────────────────────┐
                       │         Batch Synchronization Engine         │
                       │           (Idempotent POST /api/sync)        │
                       └──────────────────────┬───────────────────────┘
                                              │
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │       Central Server & Admin Portal          │
                       │   Neon PostgreSQL (Prisma ORM) + Recharts    │
                       └──────────────────────────────────────────────┘
```

---

## 1. How to Run or Access the Application Suite

### Prerequisites
- **Node.js**: v18.18+ or v20+
- **npm**: v9+ or v10+

### Setup & Startup Commands

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd farmer_offline
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables (`.env`):**
   A pre-configured `.env` file is included in the project root pointing to the live Neon PostgreSQL database:
   ```env
   DATABASE_URL="postgresql://neondb_owner:npg_k0m9APpUHyDV@ep-long-band-ap9jwocv-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
   NEXT_PUBLIC_APP_NAME="One Acre Fund Nigeria"
   ```

4. **Sync Database Schema & Seed Locations:**
   ```bash
   # Push Prisma schema to Neon PostgreSQL
   npx prisma db push

   # Populate Nigerian States, LGAs, Polling Units, and sample synced farmers
   npm run db:migrate-locations
   ```

5. **Start the Development Server:**
   ```bash
   npm run dev
   ```

6. **Access the Portal:**
   Open your browser and navigate to:
   - **Main App / Login**: [http://localhost:3000/signin](http://localhost:3000/signin)
   - Click **"Continue as Field Officer"** to register farmers offline, or **"Operations Admin"** to inspect central analytics.

---

## 2. Technology Stack Used

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router) + React 19** | Modern, performant server-side API routes and responsive client components. |
| **Styling** | **Pure Tailwind CSS v4** | Lightweight utility classes matching modern clean aesthetics, zero bloated dependencies. |
| **Offline Storage** | **Dexie.js (IndexedDB wrapper)** | High-performance client-side transactional database with reactive query hooks (`dexie-react-hooks`). |
| **Server Database** | **Neon Database (PostgreSQL via Prisma ORM)** | Serverless PostgreSQL with connection pooling, transactional upserts, and strict relational integrity. |
| **Form Validation** | **React Hook Form + Zod** | Strict schema validation with inline error messaging and custom regex for Nigerian phone numbers. |
| **Analytics & Charts** | **Recharts** | Declarative SVG bar charts and donut charts for state-by-state and programme distributions. |
| **Realtime Sync Feedback** | **Custom Event Broadcaster (`SyncProgressPopup`)** | Live progress notification showing syncing progress bar and completion metrics. |

---

## 3. How to Test Offline and Synchronization Behaviour

The application includes an **in-app Network Mode Switcher** located in the top header, allowing reviewers to test offline behavior effortlessly without opening browser developer tools.

### Test Scenario A: Testing Offline Registration
1. Start at [http://localhost:3000/register](http://localhost:3000/register).
2. Click the **"Simulate Offline"** toggle in the top-right header (or switch off network in Chrome DevTools > Network tab > "Offline").
3. Notice the amber **"Simulated Offline"** indicator and the yellow alert banner.
4. Fill in the form:
   - **Name**: `Musa Ibrahim`
   - **Phone**: `08031234567`
   - **State**: `Nasarawa` (or `Niger`, `Kano`, `Kaduna`)
   - **LGA**: Select an LGA (cascades instantly from local IndexedDB cache)
   - **Village / Polling Unit**: Pick a community cluster or click "+ Type custom village"
   - **Programme**: Select `Maize Seed & Fertilizer`
5. Click **"Save Farmer Record"**.
6. **Result**:
   - Record is stored immediately in IndexedDB with an auto-generated unique ID (e.g. `OAF-NG-2026-X8K9M`).
   - Navigating to **"Field Records"** (`/farmers`) shows the new record marked with an **amber "Pending" badge**.

### Test Scenario B: Testing Duplicate Phone Number Warning
1. On the registration form, type `08031234567` again.
2. Notice the **Custom Alert** immediately surfaces:
   > *"Duplicate Phone Number Detected: Phone number already registered on this device for Musa Ibrahim (ID: OAF-NG-2026-...)."*
3. The alert is dismissable and provides operational guidance for shared household phones.

### Test Scenario C: Testing Synchronization to Server
1. Click the header toggle **"Go Online"** (or re-enable network in DevTools).
2. Click **"Sync Now"** in the top header (or wait up to 30 seconds for the **auto-heartbeat sync** to trigger automatically).
3. Observe the floating **`SyncProgressPopup`** appear:
   - Live animated progress bar: *"Syncing 1 of 1 records..."*
   - Transitions to green checkmark: *"Sync Completed: 1 records synced"*.
4. Check **"Field Records"** (`/farmers`): The record badge updates from **"Pending"** to **"Synced ✓"**.
5. Check **"Admin Portal"** (`/admin`): The record now appears in the central database table, and the analytical KPI metrics increment in real time.

### Test Scenario D: Testing Idempotency (Duplicate Request Prevention)
1. Go to **"Sync Audit Logs"** (`/sync-logs`).
2. Even if a network glitch triggers the sync request twice, or the same payload is re-submitted, the server's `upsert` and unique ID deduplication ensures zero duplicate records are created, logging the event as `DUPLICATE_IGNORED`.

---

## 4. Key Assumptions & Limitations

1. **Rural Telephone Sharing**: In rural Nigerian communities, several members of an extended family often share a single mobile device. For this reason, the duplicate phone check acts as an **informative warning** rather than a hard block, allowing field officers to proceed if justified.
2. **Client-Side ID Generation**: Farmer IDs (`OAF-NG-2026-XXXXX`) are generated client-side with high-entropy cryptographic randomness so that records created offline have permanent, collision-resistant primary keys before ever contacting the server.
3. **Location Hierarchy Granularity**: Polling units from official INEC delimitation data are mapped to the community/village level. A free-text fallback allows field officers to register newly established settlements not yet in the official polling database.
4. **Heartbeat Fallback**: Because `navigator.onLine` can report false positives (such as being connected to a field router with no upstream satellite/cellular backhaul), the system incorporates a 30-second active health ping to `/api/health`.

---

## 5. AI Tools Used & What They Helped Accomplish

| AI Tool | Contribution & Value Delivered |
| :--- | :--- |
| **Google Antigravity (Gemini 3.8 Flash)** | Orchestrated end-to-end architecture design, offline Dexie.js schema design, idempotent sync protocol, and component implementation. |
| **Architectural Assistance** | Designed the two-tier offline caching strategy for Nigerian administrative units (State → LGA → Polling Unit), ensuring zero network latency during field data collection. |
| **Validation & Schema Design** | Generated comprehensive Zod schemas tailored to Nigerian phone number prefixes (`+234`, `080`, `070`, `081`, `090`, `091`) and input sanitization. |
| **Component System Refinement** | Refactored and modernized reusable components from `pmtool` into pure Tailwind CSS v4, building the custom dismissable alert and responsive sidebar layout. |

---

## License & Attribution
Developed for the **One Acre Fund Nigeria Tech Specialist Evaluation** (September 2026).
All trademarks belong to One Acre Fund.
