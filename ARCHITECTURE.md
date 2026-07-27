# IELTS Grader System Architecture & Technical Specifications

## 1. Executive Summary & System Purpose

The **IELTS Grader System** is an enterprise-grade, asynchronous, multi-agent AI platform specifically architected to automate the evaluation and grading of IELTS Writing Task 1 and Task 2 essays. Built using modern cloud-native patterns, the system decouples high-latency artificial intelligence operations from user-facing API interactions to guarantee real-time UI responsiveness and high system availability.

### Core Architectural Principles
- **Asynchronous Non-Blocking Execution**: AI essay evaluation takes 5–15+ seconds. The system accepts essay submissions instantly with an `HTTP 202 Accepted` response, offloading evaluation workloads to a Redis-backed background worker queue.
- **Multi-Agent AI Pipeline**: Leverages LangGraph and LangChain to orchestrate specialized LLM agents for each of the four official IELTS Writing assessment criteria (Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy).
- **Relational Persistence & Audit Tracing**: Stores user profiles, topics, essay submissions, criterion scores, granular grammar corrections, and execution logs in Supabase PostgreSQL.
- **Full-Stack Observability**: Integrated with Arize Phoenix and OpenTelemetry to trace multi-agent execution spans, prompt tokens, latency, and agent decision pathways.
- **Modern Full-Stack Paradigm**: Next.js 16 App Router on the client side coupled with a Python 3.11 FastAPI backend REST service.

---

## 2. System Topology & Infrastructure Architecture

### 2.1 System Topology Diagram

The overall system architecture and node topology are depicted below:

```text
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                             Next.js 16 Web UI                               |  |
|  |                  React 19 / Tailwind CSS v4 (Port 3000)                     |  |
|  +-------------------------------------+---------------------------------------+  |
+----------------------------------------|------------------------------------------+
                                         | HTTP REST API
                                         | (Bearer Token Auth)
                                         v
+-----------------------------------------------------------------------------------+
|                                  API GATEWAY                                      |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                             FastAPI REST API                                |  |
|  |                 Python 3.11 / Pydantic v2 (Port 8000)                        |  |
|  +-------------------+-----------------------------+---------------------------+  |
+----------------------|-----------------------------|------------------------------+
                       |                             |
     1. Enqueue Job    |                             | Direct DB Queries
    (Redis Pool)       v                             v
+------------------------------+       +---------------+-----------------------------+
|        Redis 7 Server        |       |             Supabase PostgreSQL DB          |
|         (Port 6379)          |       |          Cloud / Managed Database          |
+----------+-------------------+       +---------------+-----------------------------+
           |                                           ^
           | 2. Dequeue Job                            | DB State Updates
           v                                           | (Status, Results, Errors)
+------------------------------+                       |
|        ARQ Background        |                       |
|        Worker Process        +-----------------------+
|    (app.worker.tasks.py)     |
+------------------------------+
               |
               | 3. Invoke Evaluation
               v
+-----------------------------------------------------------------------------------+
|                               AI EVALUATION ENGINE                                |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                       LangGraph Multi-Agent Workflow                        |  |
|  |  +-------------------+  +------------------------------------------------+  |  |
|  |  | Moderation Router |  | Parallel Rubric Agents (TR, CC, LR, GRA)        |  |  |
|  |  +-------------------+  +------------------------------------------------+  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |                   Aggregator & IELTS Guardrails                       |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  +-------------------------------------+---------------------------------------+  |
+----------------------------------------|------------------------------------------+
                                         | OTLP Tracing Data (HTTP/gRPC)
                                         v
+-----------------------------------------------------------------------------------+
|                            OBSERVABILITY & TELEMETRY                              |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                             Arize Phoenix Server                            |  |
|  |            Web UI (Port 6006) / OpenTelemetry gRPC (Port 4317)              |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### 2.2 Infrastructure & Container Specifications

The backend infrastructure utilizes containerized services orchestrated via Docker Compose, separating root runtime orchestration from localized component configurations.

#### Docker Compose Configurations: Root vs. Backend

- **Root Composition (`docker-compose.yml`)**: Defines the full integration environment for multi-container local execution. Includes three active core services:
  - `fastapi`: Main REST API web service built from `./backend`.
  - `redis`: Shared in-memory message broker (`redis:7-alpine`) on port `6379`.
  - `phoenix`: Arize Phoenix observability server (`arizephoenix/phoenix:latest`) exposing ports `6006` (Web UI/OTLP HTTP) and `4317` (OTLP gRPC).
- **Backend Composition (`backend/docker-compose.yml`)**: Defines a lightweight, standalone `redis` container (`ielts_grader_redis` using `redis:alpine` with `--appendonly yes`) dedicated for localized backend API and worker development without running Phoenix or building the containerized API.

#### Containerized Services breakdown & Deployment Roadmap

| Service Name | Context / Image | Mapped Ports | Current Execution Mode | Target Production State | Purpose & Description |
|---|---|---|---|---|---|
| `fastapi` | `./backend` (`python:3.11-slim`) | `8000:8000` | Containerized (root `docker-compose.yml`) | Containerized | Asynchronous REST API service handling client endpoints, token verification, and DB/Redis orchestration. |
| `redis` | `redis:7-alpine` (root) / `redis:alpine` (`backend/`) | `6379:6379` | Containerized | Containerized / Managed | In-memory message broker providing async task queueing for ARQ background execution. |
| `phoenix` | `arizephoenix/phoenix:latest` | `6006:6006`, `4317:4317` | Containerized (root `docker-compose.yml`) | Containerized / Cloud Phoenix | OpenTelemetry collector & AI tracing web dashboard for LLM prompt and latency monitoring. |
| `frontend` | `./frontend` (`node:20-alpine`) | `3000:3000` | Local Host (`npm run dev`) | Containerized Service | Next.js 16 client application web server. |
| `arq_worker` | `./backend` (`python:3.11-slim`) | N/A (Background Task) | Local Host CLI (`arq ...`) | Containerized Service | ARQ asynchronous background worker process running evaluation jobs. |
| `supabase` | Managed Cloud Service | `5432` / `443` | Managed Cloud DB | Managed Cloud DB | External PostgreSQL database with built-in auth, storage, and auto-generated REST client support. |

#### Backend Dockerfile Configuration (`backend/Dockerfile`)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2.3 Environment & Configuration Management

Environment variables are securely loaded using Pydantic `BaseSettings` (`backend/app/core/config.py`):

```python
class Settings(BaseSettings):
    PROJECT_NAME: str = "IELTS Grader API"
    API_V1_STR: str = "/api/v1"
    SUPABASE_URL: str
    SUPABASE_KEY: str
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: str = "redis://localhost:6379"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
```

---

## 3. Frontend Architecture

### 3.1 Technology Stack & Configuration
- **Framework**: Next.js `16.2.10` (App Router structure enabled under `src/app`).
- **UI Library**: React `19.2.4` and React DOM `19.2.4`.
- **Language**: TypeScript `5.x` (configured with strict typing and `@/*` path aliasing pointing to `./src/*`).
- **Styling Engine**: Tailwind CSS v4 (`tailwindcss` `^4` and `@tailwindcss/postcss` `^4`) with CSS theme variables defined in `src/app/globals.css`.
- **Typography**: Next.js Google Font optimization importing Vercel `Geist` sans and `Geist_Mono` monospace fonts.

### 3.2 Directory Structure (`frontend/`)

```text
frontend/
├── eslint.config.mjs       # ESLint v9 configuration
├── next.config.ts          # Next.js configuration
├── package.json            # Project manifest & dependencies
├── postcss.config.mjs      # PostCSS config for Tailwind v4
├── src/
│   └── app/
│       ├── favicon.ico
│       ├── globals.css    # Global Tailwind v4 styles & theme vars
│       ├── layout.tsx     # Root HTML layout with Geist font loading
│       └── page.tsx       # Landing & home page
└── tsconfig.json           # TypeScript configuration
```

### 3.3 Target Page & Route Architecture

To fully align with the FastAPI backend, the target frontend routing model expands into the following structure:

```text
src/app/
├── (auth)/
│   ├── login/page.tsx           # User login with JWT token acquisition
│   └── register/page.tsx        # User registration form
├── (dashboard)/
│   ├── dashboard/page.tsx       # Student dashboard & quick metrics summary
│   ├── essays/
│   │   ├── page.tsx             # Paginated list of student's past essays
│   │   ├── new/page.tsx         # Essay submission interface (Task 1 / Task 2)
│   │   └── [id]/page.tsx        # Detailed grading report dashboard & radar breakdown
│   ├── topics/
│   │   ├── page.tsx             # Browse & filter IELTS Writing topics bank
│   │   └── [id]/page.tsx        # Topic prompt details & quick start writing
│   └── profile/page.tsx         # Student profile details & progress history
└── admin/
    ├── layout.tsx               # Admin layout wrapper with RBAC guard
    ├── dashboard/page.tsx       # System statistics & error rate monitors
    ├── topics/page.tsx          # Topic CRUD management dashboard
    └── logs/page.tsx            # Multi-agent execution logs & Phoenix trace viewers
```

### 3.4 State Management & API Integration Layer

```text
                        +---------------------------------------+
                        |           Next.js 16 UI Component     |
                        +-------------------+-------------------+
                                            |
                                            v
                        +---------------------------------------+
                        |      TanStack Query (Server State)    |
                        |      - Caching & Invalidations        |
                        |      - Polling (`refetchInterval`)    |
                        +-------------------+-------------------+
                                            |
                                            v
                        +---------------------------------------+
                        |       API Service Client Layer        |
                        |        (`src/lib/api-client.ts`)      |
                        |     - Bearer Auth Interceptor         |
                        |     - Global Error Handling           |
                        +-------------------+-------------------+
                                            |
                                            v
                        +---------------------------------------+
                        |      FastAPI Backend REST Endpoints   |
                        +---------------------------------------+
```

- **Client State & Form Management**: React Hook Form with Zod schemas enforcing submission validations (e.g. minimum 50 words, valid `topic_id`, task selection).
- **Server State & Data Fetching**: TanStack Query (`@tanstack/react-query`) handles asynchronous query caching, background mutations, and status polling for evaluating essays.
- **HTTP Client Abstraction (`src/lib/api-client.ts`)**: Custom wrapper (via `axios` or native `fetch`) that dynamically injects the Bearer JWT token from storage into outgoing request headers and handles standard error payloads.

### 3.5 Current State vs. Target State Comparison

| Feature / Aspect | Current Starter State | Target Production Architecture |
|---|---|---|
| **Framework** | Next.js 16 starter template (`/page.tsx` default UI) | Full IELTS Grader App Router suite |
| **Component Library** | Native HTML + Tailwind v4 primitives | Shadcn UI (`lucide-react`, Radix primitives) |
| **State Management** | None | TanStack Query + React Hook Form + Zod |
| **Auth Integration** | None | Auth Context Provider + JWT Storage Interceptor |
| **IELTS Tools** | None | Rich text/textarea editor, live word counter, band score radar charts |

---

## 4. Backend Architecture

### 4.1 Framework & Modular Design
The backend is built on **FastAPI (Python 3.11)**, utilizing Pydantic v2 for data parsing and validation. Endpoints are organized in modular routers mounted under the central `/api/v1` prefix (`app/api/api_router.py`).

### 4.2 API Endpoint Breakdown

#### 0. System Health Route (`/health`) - `app/main.py`
- `GET /health`: Health check endpoint on root application route returning `{"status": "healthy"}` for container liveness probes and service readiness checks.

#### 1. Essays Endpoint (`/api/v1/essays`) - `app/api/endpoints/essays.py`
- `POST /evaluate` (HTTP 202 Accepted): Accepts essay submissions. Validates word count ($\ge 50$ words), creates DB record in `pending` state, enqueues background job to Redis via `request.app.state.redis`, updates `task_id`, and returns immediate response with `essay_id` and `task_id`.
- `GET /{essay_id}/results`: Retrieves evaluation scores (TR, CC, LR, GRA, Overall), criterion feedback, improvement suggestions, and inline grammar errors. Admin users also receive `phoenix_trace_url`.
- `GET /`: Lists current user's submitted essays with pagination (`page`, `limit`) and status filter (`status_filter`).

#### 2. Topics Endpoint (`/api/v1/topics`) - `app/api/endpoints/topics.py`
- `GET /`: Returns active topics bank with pagination and filtering (`task_type`, `difficulty`).
- `POST /` (HTTP 201 Created): Admin-only route to create a new IELTS Writing topic prompt.
- `PUT /{topic_id}`: Admin-only route to update existing topic details.
- `DELETE /{topic_id}` (HTTP 204 No Content): Admin-only route for soft deletion (`is_active = False`).

#### 3. Users Endpoint (`/api/v1/users`) - `app/api/endpoints/users.py`
- `GET /me`: Returns current user profile details (`UserProfileResponse`).
- `PUT /me`: Updates current user profile details (`full_name`, `avatar_url`).
- `GET /me/progress`: Returns student's historical progress metrics (total essays submitted, average overall band, sub-criterion averages, best band).

#### 4. Admin Endpoint (`/api/v1/admin`) - `app/api/endpoints/admin.py`
- `GET /users`: Paginated list of registered users.
- `PUT /users/{user_id}/status`: Toggle user active/banned status.
- `GET /statistics`: System-wide analytics (total users, total essays, error rates).
- `GET /evaluations/logs`: Paginated view of multi-agent execution logs (`evaluation_logs`).

### 4.3 Authentication, Security & RBAC

Implemented in `app/core/security.py`:

```text
                       +---------------------------------------+
                       |           Incoming HTTP Request       |
                       |       Authorization: Bearer <token>   |
                       +-------------------+-------------------+
                                           |
                                           v
                       +---------------------------------------+
                       |        FastAPI HTTPBearer Guard       |
                       +-------------------+-------------------+
                                           |
                                           v
                       +---------------------------------------+
                       |    Token Validation & Resolution      |
                       |   - Valid UUID: Lookup Supabase DB    |
                       |   - Mock String: MD5 UUID Fallback    |
                       +-------------------+-------------------+
                                           |
                                           v
                       +---------------------------------------+
                       |       Role-Based Authorization        |
                       |  - get_current_active_user (is_active)|
                       |  - require_admin (role == 'admin')    |
                       |  - require_student                    |
                       +---------------------------------------+
```

- **Bearer Token Extraction**: Requests pass authorization via the `Authorization: Bearer <token>` HTTP header.
- **Identity Resolution**: `get_current_user` extracts the token. If valid UUID, queries Supabase `users` table. In development/testing environments, non-UUID mock strings (e.g. `"admin_token"`, `"student_token"`) fallback to deterministic MD5-derived UUID generation via `get_mock_uuid(token)`.
- **Role Enforcement Dependencies**:
  - `get_current_active_user`: Ensures `is_active == True` (returns `403 Forbidden` if user is inactive).
  - `require_admin`: Requires `user.role == "admin"` (returns `403 Forbidden` for non-admin requests).

---

## 5. Database Architecture & Schema (Supabase PostgreSQL)

### 5.1 Relational Entity-Relationship Diagram (ERD)

```text
       +---------------------------------------------------------------------------------------+
       |                                       users                                           |
       +---------------------------------------------------------------------------------------+
       | id (UUID, PK)                                                                         |
       | email (VARCHAR, UNIQUE)                                                               |
       | full_name (VARCHAR)                                                                   |
       | role (user_role ENUM: 'student', 'admin')                                             |
       | avatar_url (TEXT)                                                                     |
       | is_active (BOOLEAN)                                                                   |
       | created_at, updated_at (TIMESTAMPTZ)                                                  |
       +--------------------+--------------------------------+-------------------------+-------+
                            |                                |                         |
                       1:N  |                           1:N  |                    1:1  |
                            v                                v                         v
       +--------------------+-------+       +----------------+---------------+  +------+-----------------------+
       |             topics         |       |             essays             |  |     user_progress             |
       +----------------------------+       +--------------------------------+  +-------------------------------+
       | id (UUID, PK)              |       | id (UUID, PK)                  |  | id (UUID, PK)                 |
       | created_by (UUID, FK)      |       | user_id (UUID, FK)             |  | user_id (UUID, FK, UNIQUE)    |
       | title (VARCHAR)            |       | topic_id (UUID, FK, OPTIONAL)  |  | total_essays (INTEGER)        |
       | prompt_content (TEXT)      |       | content (TEXT)                 |  | avg_overall_band (FLOAT)      |
       | task_type (task_type ENUM) |       | word_count (INTEGER)           |  | avg_tr/cc/lr/gra_score (FLOAT)|
       | difficulty (enum)          |       | status (essay_status ENUM)     |  | best_overall_band (FLOAT)     |
       | is_active (BOOLEAN)        |       | task_id (VARCHAR, UNIQUE)      |  | last_submission_at (TIMESTAMP)|
       +----------------------------+       +---------------+----------------+  +-------------------------------+
                                                            |
                                                       +----+--------------------------------+
                                                  1:1  |                                1:N  |
                                                       v                                     v
                                            +----------+--------------------+        +-------+-----------------------+
                                            |       evaluation_results      |        |    evaluation_logs            |
                                            +-------------------------------+        +-------------------------------+
                                            | id (UUID, PK)                 |        | id (UUID, PK)                 |
                                            | essay_id (UUID, FK, UNIQUE)   |        | essay_id (UUID, FK)           |
                                            | task_response_score (FLOAT)   |        | agent_name (VARCHAR(50))      |
                                            | coherence_cohesion_score (FLT)|        | status (log_status ENUM)      |
                                            | lexical_resource_score (FLOAT)|        | phoenix_trace_id (VARCHAR(64))|
                                            | grammar_accuracy_score (FLOAT)|        | error_message (TEXT)          |
                                            | overall_band (FLOAT)          |        | created_at (TIMESTAMPTZ)      |
                                            | is_score_overridden (BOOLEAN) |        +-------------------------------+
                                            | tr/cc/lr/gra_feedback (TEXT)  |
                                            | raw_ai_response (JSONB)       |
                                            +---------------+---------------+
                                                            |
                                                       1:N  |
                                                            v
                                            +---------------+---------------+
                                            |        grammar_errors         |
                                            +-------------------------------+
                                            | id (UUID, PK)                 |
                                            | evaluation_id (UUID, FK)      |
                                            | error_type (VARCHAR(50))      |
                                            | original_text (TEXT)          |
                                            | corrected_text (TEXT)         |
                                            | explanation (TEXT)            |
                                            | position_start, position_end  |
                                            | severity (error_severity ENUM)|
                                            +-------------------------------+
```

### 5.2 PostgreSQL Enums Definition

Defined in `init_supabase.sql`:
1. `user_role`: `'student'`, `'admin'`
2. `task_type`: `'task1'`, `'task2'`
3. `topic_difficulty`: `'easy'`, `'medium'`, `'hard'`
4. `essay_status`: `'pending'`, `'evaluating'`, `'completed'`, `'failed'`, `'rejected'`
5. `error_severity`: `'minor'`, `'major'`, `'critical'`
6. `log_status`: `'started'`, `'success'`, `'failed'`, `'retried'`

### 5.3 Detailed Table Schema Summary

| Table Name | Primary Key | Foreign Keys | Key Columns & Descriptions |
|---|---|---|---|
| `users` | `id` (UUID) | None | Stores user profiles, authentication metadata, and active status. |
| `topics` | `id` (UUID) | `created_by` $\rightarrow$ `users(id)` | IELTS Writing prompt repository with task type and difficulty level. |
| `essays` | `id` (UUID) | `user_id` $\rightarrow$ `users(id)`, `topic_id` $\rightarrow$ `topics(id)` | Submitted essays tracked by lifecycle status and Redis task job ID. |
| `evaluation_results` | `id` (UUID) | `essay_id` $\rightarrow$ `essays(id)` (UNIQUE) | Overall band score, 4 sub-criterion scores, `is_score_overridden` flag, feedback strings, raw LLM JSON. |
| `grammar_errors` | `id` (UUID) | `evaluation_id` $\rightarrow$ `evaluation_results(id)` | Granular inline grammar mistakes, `error_type` category, corrections, explanations, and byte offsets. |
| `evaluation_logs` | `id` (UUID) | `essay_id` $\rightarrow$ `essays(id)` | Audit trail mapping multi-agent execution status, agent name, error messages, and `phoenix_trace_id`. |
| `user_progress` | `id` (UUID) | `user_id` $\rightarrow$ `users(id)` (UNIQUE) | Aggregated student stats: submission count, average scores across criteria, best overall band. |

---

## 6. Asynchronous Background Processing (ARQ + Redis Queue)

### 6.1 Architecture & Lifespan Management
Because LLM evaluation can take 5–15 seconds, synchronous processing would cause HTTP gateway timeouts. The system uses **ARQ (Async Redis Queue)** to handle background evaluation tasks.

- **Lifespan Pool (`app/main.py`)**: During FastAPI startup, an ARQ Redis connection pool is created via `arq.create_pool(RedisSettings.from_dsn(settings.REDIS_URL))` and attached to `app.state.redis`. On app shutdown, the pool is gracefully closed.
- **Enqueueing**: In `POST /api/v1/essays/evaluate`, FastAPI enqueues the evaluation task:
  ```python
  job = await request.app.state.redis.enqueue_job("evaluate_essay_task", str(essay_db["id"]))
  ```

### 6.2 Worker Execution Lifecycle (`app/worker/tasks.py`)

```text
+-----------------------------------------------------------------------------------+
|                            ARQ Worker (WorkerSettings)                            |
+-----------------------------------------------------------------------------------+
                                         |
                                         | 1. Dequeue job 'evaluate_essay_task'
                                         v
+-----------------------------------------------------------------------------------+
|                        Set Essay Status -> 'evaluating'                           |
|                       Update Supabase public.essays table                         |
+-----------------------------------------------------------------------------------+
                                         |
                                         | 2. Execute AI Evaluation Pipeline
                                         v
+-----------------------------------------------------------------------------------+
|                         Run LangGraph Multi-Agent Pipeline                        |
|       (Moderation -> Parallel Criteria Agents -> Aggregator & Guardrails)         |
+-----------------------------------------------------------------------------------+
                                         |
                                         | 3. Persist Evaluation Results
                                         v
+-----------------------------------------------------------------------------------+
|                       Write to Supabase PostgreSQL DB:                            |
|       - Insert evaluation_results (scores, feedbacks, raw_ai_response)            |
|       - Insert grammar_errors (inline text corrections & offsets)                 |
|       - Insert evaluation_logs (agent_name, status, phoenix_trace_id)            |
+-----------------------------------------------------------------------------------+
                                         |
                                         | 4. Finalize Essay Status
                                         v
+-----------------------------------------------------------------------------------+
|                Set Essay Status -> 'completed' & evaluated_at timestamp            |
+-----------------------------------------------------------------------------------+
```

---

## 7. AI & Multi-Agent Grading Pipeline (LangChain / LangGraph)

### 7.1 IELTS Rubric Scoring Requirements
The multi-agent engine evaluates essays strictly according to the 4 official IELTS Writing assessment criteria:
1. **Task Response (TR)**: Content relevance, prompt fulfillment, depth of argument, idea development.
2. **Coherence & Cohesion (CC)**: Structural flow, paragraphing, logical sequencing, cohesive linkers.
3. **Lexical Resource (LR)**: Academic vocabulary diversity, precision, collocations, spelling accuracy.
4. **Grammatical Range & Accuracy (GRA)**: Sentence structural variety, grammatical error frequency, syntax precision.

### 7.2 Multi-Agent Execution Workflow

The evaluation pipeline is orchestrated using **LangGraph** (`app/ai/graph.py`):

```text
                                  +-----------------------+
                                  |   Submitted Essay     |
                                  +-----------+-----------+
                                              |
                                              v
                                  +-----------------------+
                                  |   Moderation Router   |
                                  | (Safety & Off-Topic)  |
                                  +-----------+-----------+
                                              |
                       +----------------------+----------------------+
                       |                      |                      |
                       v                      v                      v
            +--------------------+  +--------------------+  +--------------------+
            | Task Response (TR) |  |   Coherence &      |  | Lexical Resource   |
            | Specialist Agent   |  |   Cohesion (CC)    |  | & Grammar (LR/GRA) |
            +----------+---------+  +----------+---------+  +----------+---------+
                       |                      |                      |
                       +----------------------+----------------------+
                                              |
                                              v
                                  +-----------------------+
                                  |     Aggregator &      |
                                  |   IELTS Guardrails    |
                                  |  (0.5 IELTS Rounding) |
                                  +-----------+-----------+
                                              |
                                              v
                                  +-----------------------+
                                  |  Arize Phoenix OTLP   |
                                  |  Telemetry Logger     |
                                  +-----------------------+
```

### 7.3 Agent Nodes & Responsibilities

- **Moderation Router**: Pre-screens the essay content for non-English text, profanity, prompt injection, or off-topic responses. Rejects invalid submissions early (`status = 'rejected'`).
- **Parallel Criteria Specialist Agents**:
  - Each agent receives the essay text, task prompt, and criterion rubric instructions.
  - Generates a numeric score ($0.0 - 9.0$) and criterion-specific qualitative feedback.
  - The GRA agent extracts inline grammatical mistakes with character offsets (`position_start`, `position_end`), original snippet, correction, and explanation.
- **Aggregator & IELTS Guardrails**:
  - Calculates the overall band score by taking the average of the 4 sub-criterion scores:
    $$\text{Overall Band} = \text{Round}_{\text{IELTS}}\left(\frac{\text{TR} + \text{CC} + \text{LR} + \text{GRA}}{4}\right)$$
  - Enforces standard IELTS half-band rounding rules (e.g. 6.25 rounds up to 6.5; 6.75 rounds up to 7.0; 6.125 rounds down to 6.0).
  - Synthesizes comprehensive actionable feedback and improvement recommendations.

### 7.4 Current Implementation State vs. Target Design Architecture

To maintain clear technical visibility, the system architecture explicitly delineates between current codebase implementation stubs and the full production target architecture:

1. **LangGraph Workflow Stub (`backend/app/ai/graph.py`)**:
   - *Current Implementation State*: `graph.py` defines the function `run_evaluation_pipeline(essay_id: str)` as an architectural stub. It documents the target multi-agent flow (Moderation Router $\rightarrow$ Parallel Rubric Agents $\rightarrow$ Aggregator & Guardrails $\rightarrow$ Feedback Generation).
   - *Target Architecture*: Complete `StateGraph` implementation initializing LLM agent chains (using LangChain `ChatOpenAI`/`ChatAnthropic`), structured Pydantic output parsers, and conditional edges routing between criteria agents and guardrail aggregators.

2. **Async Worker Processing & Evaluation Simulation (`backend/app/worker/tasks.py`)**:
   - *Current Implementation State*: `evaluate_essay_task` runs a simulated evaluation pipeline. It transitions essay status (`pending` $\rightarrow$ `evaluating` $\rightarrow$ `completed`), simulates AI processing latency via `await asyncio.sleep(5)`, and inserts mock evaluation results (TR: 7.0, CC: 6.5, LR: 7.0, GRA: 6.5, Overall: 7.0), a sample grammar error (`error_type: "article"`), and an audit log into Supabase. This simulation validates end-to-end task queueing, Redis connection health, and database transactions independently of LLM API availability.
   - *Target Production Integration*: Replace the 5-second simulated delay and hardcoded payload in `tasks.py` with direct execution calls to `run_evaluation_pipeline(essay_id)`, persisting dynamic criterion scores, AI feedback strings, and character-accurate grammar error offsets.

3. **Telemetry & Phoenix Trace Resolution (`evaluation_logs.phoenix_trace_id`)**:
   - *Current Implementation State*: `tasks.py` populates `phoenix_trace_id` in `evaluation_logs` with a mock string slice (`str(uuid.uuid4())[:8]`) for database schema testing.
   - *Target Production Integration*: Root `docker-compose.yml` provisions an Arize Phoenix container (`arizephoenix/phoenix:latest`) exposing OTLP endpoints on ports `6006` (HTTP) and `4317` (gRPC), with `fastapi` configured via `PHOENIX_COLLECTOR_ENDPOINT=http://phoenix:6006/v1/traces`. When OpenTelemetry auto-instrumentation is activated, real span trace IDs generated by Phoenix will be stored in `evaluation_logs` and linked to the Phoenix web dashboard URL (`GET /api/v1/essays/{essay_id}/results`).

---

## 8. Observability, Tracing & Telemetry (Arize Phoenix)

### 8.1 OpenTelemetry Architecture
To ensure transparent AI decision-making and monitor LLM prompt performance, the system integrates **Arize Phoenix** via `phoenix-otel` and `opentelemetry-api`.

```text
+------------------------------------+          OTLP Traces         +----------------------------------+
|    LangGraph Multi-Agent Engine    | ---------------------------> |       Arize Phoenix Server       |
|   (Traces agent nodes, prompt      |   HTTP: http://phoenix:6006  |   - Interactive Web Dashboard    |
|    tokens, latency, decision trees)|   gRPC: phoenix:4317         |   - Latency & Token Analytics    |
+------------------------------------+                              +----------------------------------+
```

### 8.2 Audit Log Integration (`evaluation_logs`)
Every evaluation run generates audit log records stored in the `evaluation_logs` table:
- `essay_id`: Reference to evaluated essay.
- `agent_name`: Agent identifier (e.g. `"moderation"`, `"tr_agent"`, `"aggregator"`).
- `status`: Lifecycle execution status (`started`, `success`, `failed`).
- `phoenix_trace_id`: Unique OpenTelemetry trace ID linked to the Arize Phoenix UI trace view.
- In the Admin API (`GET /api/v1/essays/{essay_id}/results`), administrators receive a direct `phoenix_trace_url` link to inspect the trace details in Phoenix.

---

## 9. End-to-End Operating Flow & Sequence Data Flow

### 9.1 Sequence Data Flow Diagram

```text
 Client UI              FastAPI Gateway            Redis Queue           ARQ Worker            LangGraph Engine         Supabase DB
    |                         |                         |                    |                        |                      |
    | 1. POST /essays/evaluate|                         |                    |                        |                      |
    |------------------------>|                         |                    |                        |                      |
    |                         | 2. Insert Essay         |                    |                        |                      |
    |                         |    (status: 'pending')  |                    |                        |                      |
    |                         |--------------------------------------------------------------------------------------------->|
    |                         |                         |                    |                        |                      |
    |                         | 3. Enqueue Job          |                    |                        |                      |
    |                         |------------------------>|                    |                        |                      |
    |                         |                         |                    |                        |                      |
    | 4. HTTP 202 Accepted    |                         |                    |                        |                      |
    |<------------------------|                         |                    |                        |                      |
    |                         |                         |                    |                        |                      |
    |                         |                         | 5. Dequeue Job     |                        |                      |
    |                         |                         |------------------->|                        |                      |
    |                         |                         |                    |                        |                      |
    |                         |                         |                    | 6. Update Status       |                      |
    |                         |                         |                    |    ('evaluating')      |                      |
    |                         |                         |                    |---------------------------------------------->|
    |                         |                         |                    |                        |                      |
    |                         |                         |                    | 7. Execute AI Pipeline |                      |
    |                         |                         |                    |----------------------->|                      |
    |                         |                         |                    |                        |                      |
    |                         |                         |                    |                        | 8. Moderation Check  |
    |                         |                         |                    |                        | 9. Parallel Agents   |
    |                         |                         |                    |                        |    (TR, CC, LR, GRA) |
    |                         |                         |                    |                        | 10. Aggregation      |
    |                         |                         |                    |                        |     & IELTS Rounding |
    |                         |                         |                    |                        |                      |
    |                         |                         |                    | 11. Pipeline Output    |                      |
    |                         |                         |                    |<-----------------------|                      |
    |                         |                         |                    |                        |                      |
    |                         |                         |                    | 12. Save Results, Errors, Logs                |
    |                         |                         |                    |     & Set Status 'completed'                  |
    |                         |                         |                    |---------------------------------------------->|
    |                         |                         |                    |                        |                      |
    | 13. Poll GET /results   |                         |                    |                        |                      |
    |------------------------>|                         |                    |                        |                      |
    |                         | 14. Query Full Results  |                    |                        |                      |
    |                         |--------------------------------------------------------------------------------------------->|
    |                         |                         |                    |                        |                      |
    | 15. Return Band Scores, |                         |                    |                        |                      |
    |     Feedback & Errors   |                         |                    |                        |                      |
    |<------------------------|                         |                    |                        |                      |
```

### 9.2 Complete Lifecycle Narrative

1. **Submission Phase**:
   - The student submits an essay on the Next.js Frontend.
   - Frontend sends `POST /api/v1/essays/evaluate` with essay content, optional topic ID, and task type.
2. **Validation & Enqueueing**:
   - FastAPI verifies token authentication and checks minimum word count ($\ge 50$ words).
   - FastAPI writes the essay record to Supabase with status `pending`.
   - FastAPI enqueues `evaluate_essay_task(essay_id)` into Redis.
   - FastAPI immediately returns `HTTP 202 Accepted` payload with `essay_id` and `task_id`.
3. **Background Processing**:
   - ARQ worker dequeues the job and updates essay status in Supabase to `evaluating`.
   - Worker triggers the LangGraph multi-agent pipeline.
   - Moderation router validates essay safety.
   - Parallel specialist agents evaluate TR, CC, LR, and GRA criteria, extracting inline grammar errors.
   - Aggregator rounds the overall band score to the nearest half-band and synthesizes improvement feedback.
   - OTLP trace data is transmitted to Arize Phoenix.
4. **Persistence & Completion**:
   - Worker writes records into `evaluation_results`, `grammar_errors`, and `evaluation_logs`.
   - Worker updates essay status to `completed` and records `evaluated_at` timestamp.
5. **Result Retrieval**:
   - Frontend polls `GET /api/v1/essays/{essay_id}/results`.
   - FastAPI queries Supabase and returns the complete evaluation report to the student.

---

## 10. Development, Testing & Deployment Guidelines

### 10.1 Local Environment Setup

1. **Start Infrastructure Services**:
   ```bash
   docker-compose up -d redis phoenix
   ```
2. **Database Initialization**:
   - Run `init_supabase.sql` in Supabase SQL Editor.
   - Optionally seed test data:
     ```bash
     cd backend
     python seed_db.py
     ```
3. **Backend Service Execution**:
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```
4. **ARQ Worker Execution**:
   ```bash
   cd backend
   arq app.worker.tasks.WorkerSettings
   ```
5. **Frontend Application Execution**:
   ```bash
   cd frontend
   npm run dev
   ```

### 10.2 Automated Test Suite

- `test_api.py`: Validates API security, token verification, RBAC authorization, Pydantic length validation ($<50$ words $\rightarrow$ HTTP 422), and submission enqueuing ($\rightarrow$ HTTP 202 Accepted).
- `test_queue.py`: End-to-end async test verifying non-blocking submission, ARQ Redis task execution, status transition (`pending` $\rightarrow$ `evaluating` $\rightarrow$ `completed`), and Supabase persistence.
- `test_supabase_integration.py`: Validates direct Supabase table insertion and relational querying.

---
*Architecture documentation finalized for IELTS Grader System.*
