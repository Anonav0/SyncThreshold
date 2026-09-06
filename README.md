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

| Method   | Endpoint         | Description                   | Status Codes        |
| -------- | ---------------- | ----------------------------- | ------------------- |
| `GET`    | `/health`        | Check API server status       | `200`               |
| `GET`    | `/inventory`     | Retrieve all inventory items  | `200`               |
| `GET`    | `/inventory/:id` | Retrieve single item by ID    | `200`, `404`, `400` |
| `POST`   | `/inventory`     | Create a new inventory item   | `201`, `400`        |
| `PUT`    | `/inventory/:id` | Update inventory item details | `200`, `404`, `400` |
| `DELETE` | `/inventory/:id` | Remove an inventory item      | `200`, `404`, `400` |

### Sample Payloads

#### Create Item (`POST /api/inventory`):

```json
{
  "name": "Cotton Yarn Spools",
  "sku": "YARN-001",
  "category": "Raw Material",
  "currentStock": 250,
  "reorderThreshold": 50,
  "unitPrice": 120,
  "averageDailySales": 10,
  "supplier": "ABC Textiles"
}
```

#### Standard Success Response:

```json
{
  "success": true,
  "data": { ... }
}
```

#### Standard Error Response:

```json
{
  "success": false,
  "message": "Inventory item not found"
}
```

---

## Architecture & Future AI Readiness

In accordance with Phase 1 constraints:

- AI analysis, Twilio notifications, and automated cron workers are **not** implemented in this phase.
- An architectural stub at `server/src/services/aiService.js` is isolated and prepared for the upcoming Google Gemini API integration in Phase 2.
- Express route controllers do not communicate directly with external providers, guaranteeing modularity and clean separation of concerns.
