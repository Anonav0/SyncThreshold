# SyncThreshold — AI Inventory Automation (Phase 1)

Phase 1 foundation for the AI-powered Inventory Reorder Automation System. This phase implements the core full-stack architecture, inventory data models, RESTful Express APIs with Mongoose, and a React + Vite + Tailwind CSS dashboard and catalog management interface.

---

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Axios, Lucide React
- **Backend**: Node.js, Express.js, Mongoose, CORS, Dotenv
- **Database**: MongoDB Atlas (or local MongoDB)

---

## Project Structure

```text
SyncThreshold/
├── client/                      # React + Vite frontend application
│   ├── public/
│   ├── src/
│   │   ├── components/          # Reusable UI components (Navbar, Modals)
│   │   ├── pages/               # Dashboard and Inventory views
│   │   ├── services/            # Axios API layer and Inventory service
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css            # Tailwind directives
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                      # Express backend API
│   ├── src/
│   │   ├── config/              # MongoDB connection configuration (database.js)
│   │   ├── controllers/         # HTTP request controllers (inventoryController.js)
│   │   ├── models/              # Mongoose data models (InventoryItem.js)
│   │   ├── routes/              # Express route definitions (inventoryRoutes.js)
│   │   ├── services/            # Business logic and future AI stub (inventoryService.js, aiService.js)
│   │   ├── utils/               # Error handler, async handler, response formatter
│   │   └── scripts/             # Database seeder (seed.js)
│   ├── .env.example
│   ├── package.json
│   └── server.js                # Express app entrypoint
│
├── .docs/                       # Documentation and specifications
├── .env.example                 # Root environment template
├── .gitignore
├── package.json                 # Root orchestrator scripts
└── README.md
```

---

## Environment Variables

### Backend (`server/.env` or root `.env`)

Create a `.env` file inside `server/` (or copy from `server/.env.example`):

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/inventory_db?retryWrites=true&w=majority
```

### Frontend (`client/.env`)

Create a `.env` file inside `client/` (or copy from `client/.env.example`):

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Setup & Installation

### 1. Prerequisites

- Node.js (v18 or higher, tested with Node v24)
- npm (v9 or higher)
- MongoDB Atlas cluster or local MongoDB instance

### 2. Install Dependencies

You can install all dependencies from the root directory:

```bash
npm run install:all
```

Or install separately:

```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

---

## Database Seeding

To populate the database with sample inventory items representing **Healthy**, **Low Stock**, and **Very Low Stock** levels:

```bash
# From the root directory
npm run seed

# Or from server directory
cd server
npm run seed
```

---

## Running the Application

### Start the Backend Server

```bash
# From root
npm run dev:server

# Or inside server/
cd server
npm run dev
```

The API server will run on `http://localhost:5000`.

### Start the React Frontend

```bash
# From root
npm run dev:client

# Or inside client/
cd client
npm run dev
```

The client will run on `http://localhost:5173`.

---

## API Endpoints

### Base URL: `http://localhost:5000/api`

#### Inventory Endpoints

| Method   | Endpoint         | Description                   | Status Codes        |
| -------- | ---------------- | ----------------------------- | ------------------- |
| `GET`    | `/health`        | Check API server status       | `200`               |
| `GET`    | `/inventory`     | Retrieve all inventory items  | `200`               |
| `GET`    | `/inventory/:id` | Retrieve single item by ID    | `200`, `404`, `400` |
| `POST`   | `/inventory`     | Create a new inventory item   | `201`, `400`        |
| `PUT`    | `/inventory/:id` | Update inventory item details | `200`, `404`, `400` |
| `DELETE` | `/inventory/:id` | Remove an inventory item      | `200`, `404`, `400` |

#### Sales Endpoints (Phase 2)

| Method | Endpoint                            | Description                                   | Status Codes        |
| ------ | ----------------------------------- | --------------------------------------------- | ------------------- |
| `POST` | `/sales`                            | Record sale and atomically reduce stock       | `201`, `400`, `404` |
| `GET`  | `/sales`                            | Retrieve all sales history records            | `200`               |
| `GET`  | `/sales/:id`                        | Retrieve single sale record by ID             | `200`, `404`, `400` |
| `GET`  | `/sales/inventory/:inventoryItemId` | Retrieve sales history for a specific product | `200`, `400`        |

#### Inventory Intelligence & Analysis Endpoints (Phase 3)

| Method | Endpoint                         | Description                                                | Status Codes        |
| ------ | -------------------------------- | ---------------------------------------------------------- | ------------------- |
| `GET`  | `/inventory/analysis?days=7`     | Deterministic sales velocity & stockout risk for all items | `200`, `400`        |
| `GET`  | `/inventory/:id/analysis?days=7` | Velocity & stockout analysis for a single inventory item   | `200`, `404`, `400` |

#### Gemini AI Risk Analysis Endpoints (Phase 4)

| Method | Endpoint                            | Description                                                              | Status Codes        |
| ------ | ----------------------------------- | ------------------------------------------------------------------------ | ------------------- |
| `POST` | `/inventory/:id/ai-analysis?days=7` | Compute velocity + run Gemini AI risk analysis & reorder recommendation  | `200`, `400`, `404` |
| `POST` | `/inventory/ai-analysis?days=7`     | Batch analyze at-risk candidates with Gemini AI (healthy items excluded) | `200`, `400`        |

#### Automated Monitoring Endpoints (Phase 5)

| Method | Endpoint                      | Description                                                                  | Status Codes |
| ------ | ----------------------------- | ---------------------------------------------------------------------------- | ------------ |
| `GET`  | `/automation/status`          | Retrieve background cron scheduler configuration, status, and latest summary | `200`        |
| `POST` | `/automation/inventory-check` | Manually trigger on-demand inventory check workflow (returns 409 if active)  | `200`, `409` |

### Sample Payloads

#### Automation Run Summary (`POST /api/automation/inventory-check`):

Response:

```json
{
  "success": true,
  "data": {
    "status": "SUCCESS",
    "startedAt": "2026-09-06T13:40:04.933Z",
    "completedAt": "2026-09-06T13:40:06.179Z",
    "itemsChecked": 9,
    "candidatesFound": 4,
    "aiAnalyses": 4,
    "geminiSuccesses": 4,
    "fallbackAnalyses": 0,
    "errors": 0,
    "candidates": [ ... ]
  }
}
```

#### Gemini AI Analysis (`POST /api/inventory/:id/ai-analysis?days=7`):

Response:

```json
{
  "success": true,
  "data": {
    "inventory": {
      "id": "67cc244d4715b74c87123456",
      "name": "Cotton Yarn Spools",
      "sku": "YARN-001",
      "category": "Raw Material"
    },
    "deterministicAnalysis": {
      "currentStock": 35,
      "reorderThreshold": 50,
      "totalUnitsSold": 56,
      "analysisDays": 7,
      "salesVelocity": 8,
      "daysUntilStockout": 4.38,
      "status": "LOW_STOCK"
    },
    "aiAnalysis": {
      "urgency": "CRITICAL",
      "recommendedAction": "REORDER_NOW",
      "reason": "Current stock of 35 is below the reorder threshold of 50, with stockout projected in 4.38 days at a sales velocity of 8 units per day.",
      "source": "gemini"
    }
  }
}
```

#### Record a Sale (`POST /api/sales`):

```json
{
  "inventoryItemId": "67cc244d4715b74c87123456",
  "quantitySold": 5
}
```

---

## Architecture & Automation Workflow (Phase 5)

- **Thin Cron Scheduler**: `server/src/jobs/inventoryMonitor.js` delegates purely to `inventoryAutomationService.js`, which coordinates `inventoryAnalysisService.js` and `aiService.js`.
- **Concurrency Protection**: An in-memory mutex (`isRunning`) prevents overlapping executions. Concurrent cron triggers skip gracefully; concurrent API calls receive `409 Conflict`.
- **Fault-Tolerant Product Iteration**: If an individual product encounters an error during audit, it logs the exception, increments error count, and continues with remaining candidates without crashing the process.
- **Identical Workflow**: Manual execution (`POST /api/automation/inventory-check`) and background cron jobs execute the exact same unified workflow.
- **No Early Notification Logic**: WhatsApp and Twilio integrations remain cleanly partitioned for Phase 6+.
