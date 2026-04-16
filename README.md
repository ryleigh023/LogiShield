# FreightSentinel 🚢
**AI-Powered Shipment Risk Platform**

Welcome to FreightSentinel, the modern, event-driven AI platform that predicts shipment delays, models risk factors dynamically using an advanced agent trace, and provides actionable recommendations to reroute or expedite cargo before delays happen.

---

## 🎯 Problem Statement
Global logistics are opaque, rigid, and highly vulnerable to cascading delays. A storm in the Pacific or a sudden strike at a major European port can strand millions of dollars of cargo. Supply chain operators currently rely on disparate systems, static ETA models, and manual emails to track risks. There is no single "pane of glass" that unifies real-time predictive analytics with immediate operational action.

## 💡 Solution
FreightSentinel provides a perfectly centered, ultra-minimalistic "Zen" dashboard that gives operators real-time visibility into their shipments. 
When an operator triggers a risk analysis, our event-driven microservices architecture dispatches an atomic task to background workers. These workers run an **Agentic AI Workflow** that pulls real-time weather, port congestion, and news data, calculating a comprehensive risk score and returning **explainable AI factors** (SHAP-style) alongside concrete recommendations.

---

## 🛠 Tech Stack
- **Frontend**: React 19, Vite, Framer Motion (for fluid iOS-style animations), TailwindCSS.
- **Backend**: FastAPI (Python), Celery (Distributed Async Workers).
- **Data & Queueing**: PostgreSQL 15, Redis 7 (Message Broker & Distributed Locks).
- **Observability**: Prometheus (Metrics), Grafana (Dashboards), Loki & Promtail (Log aggregation).
- **Deployment**: Docker Compose & Kubernetes (Minikube).

---

## 🏗 Architecture & Code Quality Rubric

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

## 🚀 How to Run

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

## 🎥 Demo Video Script & Walkthrough

**For Judges:** Follow this exact script to showcase all required functionalities in your hackathon video.

1. **Introduction (0:00 - 0:15)**
   - "Welcome to FreightSentinel. This is an AI-powered logistics platform predicting shipment risks."
   - *Action:* Show the stunning, minimalistic "Zen" login screen.

2. **Platform Security & MFA (0:15 - 0:45)**
   - "We prioritize security. I'll log in using our Multi-Factor Authentication flow."
   - *Action:* Click **Continue as Demo User** to trigger the OTP flow. Enter the demo code provided on-screen.
   - "This generates a JWT. Also, notice PII like phone numbers are encrypted in the DB and never sent to the frontend."

3. **Event-Driven Architecture & Scalability (0:45 - 1:15)**
   - "Here is the main dashboard. It's event-driven. We have two Celery workers running in parallel, connected via Redis."
   - *Action:* Point to the "Ops Indicator" at the top right showing "Healthy | 2 workers | 0 queued".

4. **Running the Analysis (1:15 - 1:45)**
   - "Let's analyze a high-risk shipment."
   - *Action:* Click the Maersk or MSC shipment.
   - "FastAPI queues the task in Redis. Our worker picks it up using an atomic, idempotent lock. You can see the agent's live reasoning streaming directly via Server-Sent Events (SSE)!"
   - *Action:* Watch the "Agent Reasoning · Live" panel populate with THOUGHT and ACTION steps.

5. **Maintainability & Code Structure (1:45 - 2:30)**
   - "Under the hood, we strictly follow MVC. We also built an explicit Singleton for our database connection."
   - *Action:* Briefly flash `backend/app/db/database.py` showing the `DatabaseSingleton` class and `backend/app/api/routes` showing the controller structure.

6. **Observability (2:30 - 3:00)**
   - "Finally, all of this is fully observable."
   - *Action:* Open `http://localhost:3001` (Grafana) to show the metrics, or switch to the **Logs** tab in the UI to demonstrate distributed tracing.

7. **Conclusion**
   - "FreightSentinel: Secure, scalable, and beautifully designed. Thank you."

Happy Shipping! 🚢
