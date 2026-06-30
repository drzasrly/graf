# SNA Dynamic Graph Framework

SNA (Social Network Analysis) Dynamic Graph Framework is a state-of-the-art interactive tool for identifying key influencers and modeling information propagation across dynamic networks.

By leveraging Incremental Closeness Centrality (ICC) and Landmark-Based Approximation (LBA) algorithms, the framework allows instant analytics without the expensive computational overhead of full graph recomputation.

## Features

- **Exact Closeness Centrality**: Uses NetworkX for exact centrality profiling.
- **Incremental Closeness Centrality (ICC)**: Recalculates closeness centrality only for nodes affected by dynamic edge additions and removals.
- **Landmark-Based Approximation (LBA)**: Accelerates closeness centrality computation for larger networks using representative landmarks (target Pearson correlation $> 0.95$).
- **Interactive Force-directed Graph**: High-performance interactive graph visualization where nodes scale based on selected centrality scoring and update colors dynamically.
- **Independent Cascade Simulation**: Simulates information flow, comparing the spreading efficiency of Top Closeness vs Top Degree nodes.
- **Usability Testing Dashboard**: Integrated timers for evaluation tasks and a calculator for System Usability Scale (SUS) scores.
- **Flask REST API**: Modular Python backend exposing graph mutations, centrality calculations, and benchmarking tools.

---

## Directory Structure

```text
sna-framework/
│
├── backend/
│   ├── app.py                  # Flask REST API entry point
│   ├── requirements.txt        # Backend dependencies
│   ├── routes/
│   │   ├── graph_routes.py     # Graph lifecycle, edits & simulations
│   │   └── centrality_routes.py# Centrality calculation & benchmarks
│   ├── algorithms/
│   │   ├── closeness_exact.py  # Exact Closeness implementation
│   │   ├── closeness_incremental.py # ICC engine
│   │   └── landmark_approximation.py # LBA engine
│   ├── services/
│   │   ├── graph_loader.py     # Graph generators and edge-list loaders
│   │   └── graph_updater.py     # Timing & benchmark helper session
│   └── benchmark/
│       ├── runtime_test.py     # Benchmark script for ICC speedup
│       └── accuracy_test.py    # Benchmark script for LBA Pearson correlation
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx             # React dashboard
│   │   ├── index.css           # Glassmorphic dark styling
│   │   ├── api/
│   │   │   └── snaApi.js       # API client service helper
│   │   └── ...
│
└── README.md
```

---

## Setup & Installation

### Prerequisite
Ensure you have Python 3.10+ and Node.js 18+ installed on your machine.

### 1. Backend Setup

From the project root folder:

```bash
# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Frontend Setup

From the `frontend` folder:

```bash
cd frontend
npm install
```

---

## Running the Application

### 1. Start the Flask Server
With the virtual environment activated, run:

```bash
python -m backend.app
```
The backend API will run locally at `http://localhost:5000`.

### 2. Start the Frontend Dev Server
In a separate terminal, navigate to the `frontend/` folder and run:

```bash
npm run dev
```
Open `http://localhost:5173` in your browser to interact with the dashboard.

---

## REST API Documentation

### Initialise Graph
`POST /api/init`
Body:
```json
{
  "source_type": "synthetic",
  "name": "barabasi_albert",
  "n": 100,
  "m": 2
}
```

### Get Graph Metadata
`GET /api/info`

### Add Edge
`POST /api/edge/add`
Body:
```json
{
  "source": "1",
  "target": "2"
}
```

### Remove Edge
`POST /api/edge/remove`
Body:
```json
{
  "source": "1",
  "target": "2"
}
```

### Get Centrality (Standard API)
`POST /api/centrality`
Body (Optional, queries single node):
```json
{
  "node": "15"
}
```

Response:
```json
{
  "node": "15",
  "closeness": 0.732
}
```

### Get Ranked Influencers
`GET /api/centrality/influencers?limit=10`
