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

### Sample Payloads

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

## Architecture & AI Isolation (Phase 4)

- **AI Service Isolation**: Google Gemini SDK is strictly encapsulated within `server/src/services/aiService.js`. Routes, models, and controllers have zero awareness of the specific Gemini SDK.
- **Strict Server-Side Validation**: AI outputs are parsed and validated via `aiResponseValidator.js` against the enum schema (`urgency`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`; `recommendedAction`: `MONITOR`, `PLAN_REORDER`, `REORDER_SOON`, `REORDER_NOW`).
- **Deterministic Fallback**: If Gemini encounters network failure, rate limits, or is disabled (`AI_ENABLED=false`), the system gracefully defaults to deterministic thresholds with `source: "fallback"` without crashing Express.
- **Manual Trigger in UI**: Gemini is only invoked upon explicit user interaction in the UI to minimize token usage and prevent automated runaway calls.
- **No Early Notification or Cron Logic**: Automated cron jobs and WhatsApp/Twilio alerts remain cleanly partitioned for Phase 5+.
