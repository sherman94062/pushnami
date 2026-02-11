# Landing Page Tracking System

A multi-service landing page system with A/B testing, metrics tracking, feature toggles, and an admin dashboard.

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

- **Health checks** — Docker Compose health checks with dependency ordering ensure services start in the correct order
- **Error handling** — Centralized error handler maps PostgreSQL error codes to appropriate HTTP responses; internal details hidden in production
- **Graceful shutdown** — API service handles SIGTERM/SIGINT, draining connections before exit
- **Security headers** — Helmet middleware sets secure HTTP headers; CORS configured
- **Input validation** — All API endpoints validate required fields and types
- **Non-root containers** — Docker containers run as the `node` user, not root
- **Silent tracking** — Client-side event tracking catches and logs errors silently to never break the user experience
- **Indexed queries** — Database indexes on foreign keys, event filters, and assignment lookups for query performance
- **Multi-stage builds** — Next.js services use multi-stage Docker builds with standalone output for minimal image size

## API Endpoints

### Experiments
- `GET /api/experiments` — List all experiments with variants
- `GET /api/experiments/:id` — Get single experiment
- `POST /api/experiments` — Create experiment
- `PUT /api/experiments/:id` — Update experiment
- `POST /api/experiments/:id/variants` — Add variant
- `GET /api/experiments/assign?visitor_id=X&experiment_name=Y` — Get/create assignment

### Metrics
- `POST /api/events` — Ingest event
- `GET /api/events/stats?experiment_id=X` — Aggregated stats by variant
- `GET /api/events` — Raw events (supports `limit`, `offset`, `experiment_id`, `event_type` filters)

### Feature Toggles
- `GET /api/toggles` — List all toggles
- `GET /api/toggles/:key` — Get toggle by key
- `PUT /api/toggles/:id` — Update toggle
- `POST /api/toggles` — Create toggle
