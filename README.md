# Landing Page Tracking System

A production-ready multi-service landing page system with A/B testing, metrics tracking, feature toggles, and an admin dashboard.

## Architecture

```
┌──────────────────┐     ┌──────────────────┐
│  Landing Page    │────▶│   API Service     │────▶ PostgreSQL
│  (Next.js :3000) │     │  (Express :4000)  │
└──────────────────┘     └──────────────────┘
┌──────────────────┐            ▲
│   Admin App      │────────────┘
│  (Next.js :3001) │
└──────────────────┘
```

**4 Docker containers:**

| Service | Port | Purpose |
|---------|------|---------|
| `postgres` | 5432 | PostgreSQL 16 database |
| `api-service` | 4000 | REST API — experiments, assignments, metrics, feature toggles |
| `landing-page` | 3000 | User-facing landing page with A/B variant rendering |
| `admin-app` | 3001 | Admin dashboard for toggles and stats |

The three backend concerns (A/B testing, metrics, feature toggles) are consolidated into a single Express API service with separate route modules. This eliminates unnecessary network hops and simplifies deployment while preserving clean logical separation via Express routers.

## Quick Start

```bash
# Install API service dependencies (one-time setup)
cd services/api-service && npm install && cd ../..

# Start all services
docker compose up --build
```

Then visit:
- **Landing Page:** http://localhost:3000
- **Admin Dashboard:** http://localhost:3001
- **API Health Check:** http://localhost:4000/health

## How It Works

### A/B Testing
- Visitors are assigned to experiment variants deterministically using an MD5 hash of `visitor_id:experiment_id`
- Assignments are persisted in the database, so the same visitor always sees the same variant
- The landing page hero section varies based on variant config (different headline, subtitle, CTA text, layout)

### Metrics Tracking
- The landing page tracks `page_view`, `cta_click`, and `section_view` events
- Events include visitor ID, experiment ID, variant ID, and event type for filtering
- The admin dashboard shows per-variant event counts, unique visitors, and conversion rates
- Event ingestion is rate-limited (300 requests/minute) to prevent abuse

### Feature Toggles
- **show_testimonials** — Toggle the testimonials section on/off
- **cta_text_override** — Override the CTA button text with custom copy
- **show_banner** — Toggle a promotional banner with configurable text and color

Toggles take effect on the next page load (the landing page fetches toggles server-side on each request).

## Design Decisions

### Single API Service
Rather than three separate backend services, experiments, metrics, and feature toggles are implemented as separate route modules within a single Express application. This reduces Docker container count, eliminates inter-service network latency, and uses a single database connection pool — while maintaining clean separation of concerns through Express routers and separate source files.

### Raw SQL over ORM
The API uses `pg` (node-postgres) with parameterized queries instead of an ORM. The queries in this system are straightforward, and raw SQL provides full control, better performance visibility, and fewer abstraction layers to debug.

### Server-Side Rendering
The landing page uses Next.js App Router with server components. Assignment and toggle fetches happen server-side using Docker-internal hostnames, ensuring fast initial render and eliminating client-side loading states for critical content.

### Deterministic Variant Assignment
Variant assignment uses MD5 hashing of `visitor_id:experiment_id` mapped to weighted variant buckets. The database enforces uniqueness via a `UNIQUE(experiment_id, visitor_id)` constraint with `ON CONFLICT DO NOTHING` for race condition safety.

## Production Readiness

This system implements comprehensive production-ready features:

### Security & Protection
- **Rate Limiting** — Three-tier rate limiting protects against abuse:
  - General API: 100 requests per 15 minutes
  - Write operations: 20 requests per 15 minutes  
  - Event ingestion: 300 requests per minute
- **Security Headers** — Helmet middleware with CSP, HSTS, and other secure headers
- **CORS Configuration** — Configurable allowed origins (restrictive in production)
- **Input Validation** — Schema-based validation using express-validator for all endpoints
- **Sanitized Errors** — Internal error details hidden in production; PostgreSQL error codes mapped to user-friendly messages
- **Non-root Containers** — Docker containers run as the `node` user, not root

### Reliability & Observability
- **Structured Logging** — Winston logger with timestamps, context, and log levels (debug/info/warn/error)
- **Request Logging** — All HTTP requests logged with method, path, status, duration, IP, and user agent
- **Health Checks** — Enhanced health endpoint with database latency, connection pool stats, uptime, and memory usage
- **Graceful Shutdown** — Handles SIGTERM/SIGINT signals, drains connections, closes database pool gracefully
- **Uncaught Exception Handling** — Logs and handles uncaught exceptions and unhandled promise rejections

### Performance & Scalability  
- **Query Timeouts** — 30-second timeout on all database queries to prevent hanging
- **Request Timeouts** — 30-second timeout on HTTP requests
- **Connection Pooling** — Configured PostgreSQL pool (20 max connections, 30s idle timeout)
- **Database Indexes** — Indexes on all foreign keys, frequently queried fields, and filter columns
- **Pagination** — All list endpoints support pagination with configurable limits (max 200 items)
- **Multi-stage Docker Builds** — Next.js services use standalone output for minimal image size

### Data Integrity & Validation
- **Schema Validation** — Comprehensive validation rules for all request bodies and query parameters
- **Parameterized Queries** — All SQL queries use parameterized inputs to prevent SQL injection
- **Unique Constraints** — Database-level uniqueness enforced for experiments, variants, and assignments
- **Foreign Key Constraints** — Referential integrity enforced at database level with CASCADE deletes
- **Input Sanitization** — Trimming, length limits, and regex patterns for all string inputs

### Developer Experience
- **Clear Error Messages** — Validation errors include field name, message, and invalid value
- **API Versioning** — Routes available at both `/api/v1/...` and `/api/...` for backward compatibility
- **Comprehensive Logging** — All CRUD operations logged with relevant context
- **Health Monitoring** — Detailed health endpoint for monitoring and alerting integration

## API Endpoints

All endpoints support API versioning via `/api/v1/...` prefix (legacy `/api/...` also supported).

### Experiments
- `GET /api/v1/experiments` — List all experiments with variants
- `GET /api/v1/experiments/:id` — Get single experiment
- `POST /api/v1/experiments` — Create experiment (rate limited: 20/15min)
- `PUT /api/v1/experiments/:id` — Update experiment (rate limited: 20/15min)
- `POST /api/v1/experiments/:id/variants` — Add variant (rate limited: 20/15min)
- `GET /api/v1/experiments/assign?visitor_id=X&experiment_name=Y` — Get/create assignment

### Metrics
- `POST /api/v1/events` — Ingest event (rate limited: 300/min)
- `GET /api/v1/events/stats?experiment_id=X` — Aggregated stats by variant
- `GET /api/v1/events` — Raw events with pagination (supports `limit`, `offset`, `experiment_id`, `event_type`, `visitor_id` filters)

### Feature Toggles
- `GET /api/v1/toggles` — List all toggles
- `GET /api/v1/toggles/:key` — Get toggle by key
- `PUT /api/v1/toggles/:id` — Update toggle (rate limited: 20/15min)
- `POST /api/v1/toggles` — Create toggle (rate limited: 20/15min)

### Monitoring
- `GET /health` — System health check with database metrics, uptime, memory usage

## Testing

```bash
cd services/api-service
npm test                # Run all tests
npm run test:unit       # Run unit tests only
npm run test:integration # Run integration tests only
```

## Project Structure

```
pushnami/
├── docker-compose.yml           # Multi-service orchestration
├── db/
│   ├── init.sql                # Database schema
│   └── seed.sql                # Initial data
├── services/
│   ├── api-service/            # Express REST API
│   │   ├── src/
│   │   │   ├── app.js          # Express app configuration
│   │   │   ├── index.js        # Server startup & shutdown
│   │   │   ├── config.js       # Environment configuration
│   │   │   ├── db.js           # Database connection pool
│   │   │   ├── middleware/     # Express middleware
│   │   │   │   ├── errorHandler.js      # Centralized error handling
│   │   │   │   ├── rateLimiter.js       # Rate limiting tiers
│   │   │   │   └── validation.js        # Request validation
│   │   │   ├── routes/         # API route modules
│   │   │   │   ├── experiments.js       # A/B testing endpoints
│   │   │   │   ├── metrics.js           # Event tracking endpoints
│   │   │   │   └── toggles.js           # Feature toggle endpoints
│   │   │   └── utils/
│   │   │       ├── assignVariant.js     # Deterministic assignment
│   │   │       └── logger.js            # Structured logging
│   │   └── __tests__/          # Jest tests
│   ├── landing-page/           # Next.js user-facing app
│   └── admin-app/              # Next.js admin dashboard
└── e2e/                        # Playwright end-to-end tests
```

## Environment Variables

### API Service
- `DATABASE_URL` — PostgreSQL connection string (required)
- `PORT` — Server port (default: 4000)
- `NODE_ENV` — Environment: development | production (default: development)

### Landing Page & Admin App
- `API_BASE_URL` — Internal API URL for server-side requests (e.g., http://api-service:4000)
- `NEXT_PUBLIC_API_BASE_URL` — Public API URL for client-side requests (e.g., http://localhost:4000)
- `PORT` — Server port (landing: 3000, admin: 3001)

## License

Private project for Pushnami take-home assignment.
