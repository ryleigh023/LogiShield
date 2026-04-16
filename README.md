# FreightSentinel 
Made for HackStrom'26
By team Guppy

**AI-Powered Shipment Risk Platform**

Welcome to FreightSentinel, the modern, event-driven AI platform that predicts shipment delays, models risk factors dynamically using an advanced agent trace, and provides actionable recommendations to reroute or expedite cargo before delays happen.

Try it out: https://drive.google.com/file/d/1pq6k6bvqLYcBmUvfC6-Ch9oJ2nWghMuQ/view?usp=sharing
---

##  Problem Statement
Global logistics are opaque, rigid, and highly vulnerable to cascading delays. A storm in the Pacific or a sudden strike at a major European port can strand millions of dollars of cargo. Supply chain operators currently rely on disparate systems, static ETA models, and manual emails to track risks. There is no single "pane of glass" that unifies real-time predictive analytics with immediate operational action.

##  Solution
FreightSentinel provides a perfectly centered, ultra-minimalistic "Zen" dashboard that gives operators real-time visibility into their shipments. 
When an operator triggers a risk analysis, our event-driven microservices architecture dispatches an atomic task to background workers. These workers run an **Agentic AI Workflow** that pulls real-time weather, port congestion, and news data, calculating a comprehensive risk score and returning **explainable AI factors** (SHAP-style) alongside concrete recommendations.

---

##  Tech Stack
- **Frontend**: React 19, Vite, Framer Motion (for fluid iOS-style animations), TailwindCSS.
- **Backend**: FastAPI (Python), Celery (Distributed Async Workers).
- **Data & Queueing**: PostgreSQL 15, Redis 7 (Message Broker & Distributed Locks).
- **Observability**: Prometheus (Metrics), Grafana (Dashboards), Loki & Promtail (Log aggregation).
- **Deployment**: Docker Compose & Kubernetes (Minikube).

---

## Architecture & Code Quality Rubric

### Model-View-Controller (MVC) Pattern
Our application clearly separates concerns:
- **Model**: Located in `backend/app/db/models.py`, utilizing SQLAlchemy ORM to manage the schema and database interactions.
- **View**: The React frontend (`frontend/src/components`) acts as the view layer, providing state-driven dynamic rendering.
- **Controller**: Located in `backend/app/api/routes/`, handling HTTP requests, orchestrating business logic, and returning structured JSON.

### Singleton Pattern for Database Connection
To ensure efficiency and prevent connection leaks, the database connection uses a strict **Singleton Pattern**.
- **File:** `backend/app/db/database.py`
- **Implementation:** The `DatabaseSingleton` class uses thread-locking to guarantee that only one connection pool registry (`create_engine`) and `sessionmaker` is created across the application lifecycle.

### Proper API Structure
The API is cleanly structured using FastAPI routers, grouped by domain (`/api/v1/analyze`, `/api/v1/shipments`, `/api/v1/stats`, `/auth`). It uses Pydantic schemas for request/response validation, ensuring strong typing and automatic Swagger documentation.

### Scalability & Event-Driven Architecture
- **Asynchronous Workers:** Time-consuming AI analysis runs outside the main thread. FastAPI queues tasks to Redis, which are picked up by a pool of Celery Workers (`worker1`, `worker2`).
- **Atomic & Idempotent:** Workers use Redis `SET NX EX` locks to guarantee tasks are picked up atomically and prevent duplicate executions.

### Platform Security
- **MFA (OTP) & JWT:** Email-based OTP verification, issuing short-lived Access Tokens (JWT) and Refresh tokens.
- **Role-Based Access Control (RBAC):** Admin and General User roles define endpoint access.
- **Google Sign-In:** OIDC integration for instant onboarding.
- **PII Protection:** Phone numbers and sensitive data are encrypted at rest using Fernet (`backend/app/auth/pii.py`) and stripped from all frontend API payloads.

### Observability & Logging
- Tracing middleware propagates `X-Trace-Id` across requests and worker tasks.
- Dedicated `/metrics` endpoint for Prometheus scraping.
- Custom structured logging streamed directly to the frontend's Live Trace panel.

---

##  How to Run

### Option 1: Docker Compose (Recommended)
1. Ensure Docker is running.
2. Run the full stack:
   ```bash
   docker compose up --build
   ```
3. **Access the Apps:**
   - Frontend: `http://localhost:5173`
   - Backend API Docs: `http://localhost:8000/docs`
   - Grafana: `http://localhost:3001` (admin/admin)
   - Prometheus: `http://localhost:9090`

### Option 2: Kubernetes (Minikube)
To demonstrate local Kubernetes scaling, use the provided manifests:
1. Start minikube: `minikube start`
2. Build local images inside minikube: 
   ```bash
   eval $(minikube docker-env)
   docker build -t freightsentinel-backend:latest ./backend
   docker build -t freightsentinel-frontend:latest ./frontend
   ```
3. Apply manifests:
   ```bash
   kubectl apply -f k8s/
   ```
4. Expose the frontend service: `minikube service frontend`

---
## Screenshots

<p align="center">
  <img src="freight1.jpeg" width="700"/>
</p>

<p align="center">
  <img src="freight2.jpeg" width="700"/>
</p>

<p align="center">
  <img src="freight3.jpeg" width="700"/>
</p>

<p align="center">
  <img src="freight4.jpeg" width="700"/>
</p>

<p align="center">
  <img src="freight5.jpeg" width="700"/>
</p>


## Demo Video
Gdrive link: https://drive.google.com/file/d/1pq6k6bvqLYcBmUvfC6-Ch9oJ2nWghMuQ/view?usp=sharing

**Conclusion**
   - "FreightSentinel: Secure, scalable, and beautifully designed. Thank you."

