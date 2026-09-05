# One Acre Fund Nigeria — Offline-First Farmer Registration & Admin Suite

> **Farmers First | Tech Specialist R1 Exercise Prototype**

**Live Deployed Application:** [https://farmer-offline.vercel.app/](https://farmer-offline.vercel.app/)

An offline-first web application prototype designed for One Acre Fund Field Officers operating in rural Nigerian communities with intermittent or zero internet connectivity. Field officers can capture farmer records completely offline with instant local validation, preserve 100% of data via client-side IndexedDB, and synchronize seamlessly to a central Neon PostgreSQL cloud database whenever internet connectivity is restored.

---

## 🧭 Quick Application Navigation Guide

The application suite provides tailored experiences for both **Field Officers** and **Operations Supervisors**:

| Section / Page                   | Route             | Intended User      | Key Capabilities                                                                                                                                   |
| :------------------------------- | :---------------- | :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Farmer Registration**          | `/register`       | Field Officer      | Fast, offline-first registration form with cascading Nigerian States/LGAs/Polling Units, duplicate phone detection, and instant IndexedDB storage. |
| **Field Records**                | `/farmers`        | Field Officer      | View locally captured farmers, filter by sync status (`Pending` / `Synced`), search by name/phone/ID, and view farmer profile cards.               |
| **Admin Portal**                 | `/admin`          | Operations Admin   | Centralized supervisor dashboard with real-time KPI metrics, crop programme distribution charts, and regional enrollment analytics.                |
| **Field Officers & Performance** | `/admin/officers` | Operations Admin   | Officer management directory showing field assignments, total registered farmers per officer, and a "View Farmers" inspection modal.               |
| **Sync Audit Logs**              | `/sync-logs`      | Admin / Supervisor | Complete historical audit trail of all synchronization batches, payload sizes, device IDs, and deduplication statuses.                             |
| **Network & Sync Controller**    | Top Header        | All Users          | One-click **"Simulate Offline" / "Go Online"** toggle, manual **"Sync Now"** trigger, and live animated progress notification.                     |

---

## 1. How to Run or Access the Application Suite

### Option A: Access the Live Deployment (Instant)

Access the live prototype directly in your browser:
👉 **[https://farmer-offline.vercel.app/](https://farmer-offline.vercel.app/)**

**One-Click Demo Credentials:**

- **Field Officer Portal:** `officer.nigeria@oneacrefund.org` / `Password123!`  
  _(Captures farmer profiles offline, queues records locally, triggers sync)_
- **Operations Admin Portal:** `admin.operations@oneacrefund.org` / `Password123!`  
  _(Supervises field officers, monitors regional analytics, reviews central PostgreSQL records)_

---

### Option B: Running Locally

#### Prerequisites

- **Node.js**: v18.18+ or v20+
- **npm**: v9+ or v10+

#### Simple 3-Step Setup

1. **Clone the repository and install dependencies:**

   ```bash
   git clone <repo-url>
   cd farmer_offline
   npm install
   ```

2. **Configure Environment:**
   Copy the provided environment template (pre-configured for database access):

   ```bash
   cp .env.example .env
   ```

3. **Start the application:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 2. The Technology Stack Used

| Layer                               | Technology                             | Rationale & Architectural Fit                                                                                                                   |
| :---------------------------------- | :------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**                       | **Next.js 16 (App Router) + React 19** | Server-side rendering, API route handlers for synchronization endpoints, and optimized client bundle.                                           |
| **Styling & Design System**         | **Tailwind CSS v4**                    | Lightweight modern aesthetics. Dual-view layout featuring high-density tables for desktop and responsive touch cards for mobile field devices.  |
| **Offline Storage**                 | **Dexie.js (IndexedDB wrapper)**       | High-throughput client-side database with reactive live queries (`dexie-react-hooks`). Enables instant reads/writes without network roundtrips. |
| **Server Database**                 | **Neon PostgreSQL via Prisma ORM**     | Cloud PostgreSQL with connection pooling, transactional batch upserts, strict relational integrity, and automated schema management.            |
| **Validation & Integrity**          | **React Hook Form + Zod**              | Client-side and server-side schema validation with custom Nigerian telephone formatting (`+234`, `080`, `070`, `081`, `090`, `091`).            |
| **Notifications & Cloud Messaging** | **Firebase SDK & FCM Integration**     | Client SDK and backend service account structure configured for real-time alerts and background sync dispatching.                               |
| **Analytics & Visualizations**      | **Recharts + Lucide Icons**            | Interactive SVG donut charts and regional distribution bar charts for real-time operational monitoring.                                         |

---

## 3. How to Test the Offline and Synchronization Behaviour

The application includes an **in-app Network Mode Switcher** in the top header, allowing reviewers to simulate offline behavior on any device without opening browser developer tools.

### Test Scenario 1: Offline Farmer Registration

1. Navigate to **Farmer Registration** (`/register`).
2. Click the **"Simulate Offline"** button in the header (or switch Chrome DevTools > Network to "Offline").
3. Notice the amber **"Simulated Offline"** indicator and banner confirming the device is operating offline.
4. Fill in the form:
   - **Full Name:** `Musa Ibrahim`
   - **Phone Number:** `08031234567`
   - **State & LGA:** Cascades instantly from the local IndexedDB cache without internet.
   - **Village / Polling Unit:** Select an INEC polling unit cluster or enter a custom village.
   - **Crop Programme:** `Maize Seed & Fertilizer`
5. Click **"Save Farmer Record"**.
6. **Result:** The record saves in milliseconds with a unique client ID (e.g. `OAF-NG-2026-X8K9M`). On **Field Records** (`/farmers`), the record appears immediately with an **amber "Pending" badge**.

### Test Scenario 2: Offline Duplicate Phone Number Warning

1. While still offline, open the registration form (`/register`).
2. Enter the same phone number (`08031234567`).
3. **Result:** A dismissable operational warning appears immediately:
   > _"Duplicate Phone Number Detected: Phone number already registered on this device for Musa Ibrahim (ID: OAF-NG-2026-...)."_
   > Field officers are alerted to potential duplicates while retaining the flexibility required for shared family devices.

### Test Scenario 3: Cloud Synchronization

1. Click the header toggle **"Go Online"** (or uncheck Offline in DevTools).
2. Click **"Sync Now"** in the header (or wait up to 30 seconds for the **auto-heartbeat sync** to trigger automatically).
3. **Result:**
   - The animated **`SyncProgressPopup`** displays live progress (`Syncing 1 of 1 records...`) followed by a green completion checkmark.
   - On **Field Records** (`/farmers`), the status updates to **"Synced ✓"**.
   - On the **Admin Portal** (`/admin`), the new farmer appears in the central database table and KPI analytics increment in real time.

### Test Scenario 4: Idempotency & Fault Tolerance

1. Navigate to **Sync Audit Logs** (`/sync-logs`).
2. Trigger **"Sync Now"** again with no new records.
3. The server validates payloads against unique client IDs (`OAF-NG-2026-...`), ensuring zero duplicate entries in PostgreSQL even during network retry spikes.

### Test Scenario 5: Supervisor Field Officer Tracking

1. Sign in as **Operations Admin** (`admin.operations@oneacrefund.org`).
2. Navigate to **Field Officers** (`/admin/officers`).
3. View officer deployment areas, total farmers registered, and click **"View Farmers"** to inspect all farmer profiles submitted by that officer.

---

## 4. Key Assumptions or Limitations

1. **Shared Family Telephones:** In rural agrarian households, multiple family members frequently share a single phone. Consequently, duplicate phone detection operates as an **informative warning** rather than a hard block to avoid excluding legitimate farmers.
2. **Client-Side Cryptographic ID Generation:** Farmer IDs (`OAF-NG-2026-XXXXX`) are generated client-side using high-entropy alphanumeric strings. This ensures every offline record possesses a permanent, collision-resistant primary key before ever contacting the server.
3. **Location Hierarchy Granularity:** Official INEC polling unit delimitation data is pre-cached to the village/cluster tier. A free-text fallback allows field officers to record newly established hamlets not yet cataloged in official databases.
4. **Active Heartbeat Fallback:** Because mobile browsers occasionally report false online status when connected to captive WiFi routers lacking actual cellular backhaul, the system utilizes a 30-second background heartbeat ping to `/api/health`.
5. **Client Storage Durability:** Offline data relies on browser IndexedDB storage. If a user clears their browser cache before synchronizing, unsynced local records would be cleared. The interface clearly communicates pending records to encourage synchronization before maintenance.

---

## 5. The AI Tools Used and What They Helped Accomplish

| AI Tool & Model                               | Contribution & Value Delivered                                                                                                                                                              |
| :-------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Google Antigravity IDE (Gemini 3.8 Flash)** | **End-to-End System Architecture:** Orchestrated the entire full-stack architecture, defining the IndexedDB schema, Next.js route handlers, and idempotent sync engine.                     |
| **AI Data Pipeline & Migration**              | **Administrative Location Parsing:** Developed scripts to ingest and structure 176,000+ Nigerian INEC polling units into a lightweight hierarchical JSON and PostgreSQL seed dataset.       |
| **Resilient Synchronization Design**          | **Idempotent Upsert Protocol:** Designed the batch synchronization protocol with transaction safety in Prisma, ensuring zero data duplication during network drops.                         |
| **Responsive UI/UX Engineering**              | **Mobile-First Layouts:** Implemented modern, accessible Tailwind CSS v4 layouts with dual-mode responsive rendering (desktop tables and mobile touch cards for field tablets/phones).      |
| **Validation & Error Handling**               | **Localized Schema Validation:** Formatted strict Zod schemas customized to Nigerian telecommunications numbering plans (`080`, `081`, `070`, `090`, `091`) and localized identity formats. |

---

## 📄 License & Attribution

Developed for the **One Acre Fund Nigeria Tech Specialist Evaluation** (September 2026).  
Farmers First. All trademarks belong to One Acre Fund.
