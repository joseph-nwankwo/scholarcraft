# LectureCraft — System Architecture

## Overview

LectureCraft is a multi-tenant, AI-powered academic content platform for Nigerian/African higher education. It follows a layered service-oriented architecture deployed as Docker containers, with optional Kubernetes orchestration.

## High-Level Topology

```
                         ┌───────────────────┐
                         │   Nginx (TLS)      │
                         │   Port 443/80      │
                         └────────┬──────────┘
                    ┌─────────────┴─────────────┐
              ┌─────▼──────┐             ┌──────▼──────┐
              │  Frontend  │             │   Backend   │
              │ React/Vite │             │ Express API  │
              │  Port 80   │             │  Port 4000   │
              └────────────┘             └──────┬───────┘
                                    ┌───────────┼───────────┐
                               ┌────▼────┐ ┌───▼───┐ ┌─────▼─────┐
                               │Postgres │ │ Redis │ │  AWS S3   │
                               │ Port    │ │ 6379  │ │  Storage  │
                               │ 5432    │ └───────┘ └───────────┘
                               └─────────┘
```

## Component Descriptions

### Frontend (React 19 + Vite 8)
- **Build**: Vite with Tailwind CSS v4 (CSS-first config)
- **Routing**: React Router v7 (file-system-adjacent route definitions)
- **State**: TanStack Query v5 for server state; React Context for auth/theme
- **Real-time**: socket.io-client v4 connected to the backend WebSocket gateway
- **Port**: 3001 (dev), 80 (prod container)

### Backend (Express 4 + TypeScript)
- **Entry**: `src/app.ts` → HTTP server → Express middleware stack → API routes
- **ORM**: Prisma v6 with 35+ models on PostgreSQL
- **Queue**: BullMQ workers on Redis for async billing and collaboration tasks
- **WebSocket**: Socket.IO v4 gateway mounted on the same HTTP server
- **Port**: 4000

### Database (PostgreSQL 16)
- Multi-tenant schema via `institutionId` scoping on all tables
- Soft-delete pattern (`deletedAt` nullable timestamp)
- Full audit trail via `AuditLog` model
- Extensions: `uuid-ossp`, `pg_trgm`, `unaccent`

### Cache / Queue (Redis 7)
- **BullMQ queues**: `billing`, `collaboration`
- **Rate limiting**: express-rate-limit in-memory (upgrade to Redis store for multi-replica)
- **Session data**: JWT is stateless; Redis used for token blacklisting (planned)

### Object Storage (AWS S3)
- Multipart uploads via presigned URLs
- Bucket: `lecturercraft-{env}-uploads`
- Documents, exports, profile images

## API Architecture

All API routes follow RESTful conventions under `/api/`:

| Prefix | Feature Area |
|--------|-------------|
| `/api/auth` | Authentication, JWT, sessions |
| `/api/institutions` | Tenant management |
| `/api/academic` | Faculties, departments, programmes, courses |
| `/api/documents` | Document CRUD, versioning, approvals |
| `/api/ai` | AI generation (streaming SSE) |
| `/api/generate` | Content generation engine |
| `/api/library` | Document library with filters |
| `/api/questions` | Question bank |
| `/api/assessments` | Assessment management |
| `/api/analytics` | Analytics dashboard data |
| `/api/billing` | Subscriptions, invoices, webhooks |
| `/api/exports` | PDF/DOCX export center |
| `/api/users` | User management |

## Authentication Flow

```
Client → POST /api/auth/login
       ← { accessToken (15min), refreshToken (7d, HttpOnly cookie) }

Client → API request with Authorization: Bearer <accessToken>
       ← Resource

Client → POST /api/auth/refresh (uses HttpOnly cookie)
       ← { accessToken (new) }
```

## AI Generation Pipeline

```
Client → POST /api/ai/stream
         { prompt, systemPrompt, moduleType }
       → AI provider selection (OpenAI / Anthropic / Google)
       → SSE stream: data: { chunk } ... data: { done: true, documentId }
       → Document auto-saved to library
```

## Real-time (Socket.IO)

Events flow through authenticated Socket.IO connections:

```
Client connects with JWT in handshake
→ Server validates JWT → joins user:{userId} and institution:{institutionId} rooms
→ Bidirectional events: presence, messaging, typing, collaboration sync
```

## Multi-tenancy

Every database query is automatically scoped by `institutionId`:
- Middleware extracts user's institution from their JWT claims
- RBAC checks run within the institution's permission tree
- Cross-institution data access is impossible via normal API routes

## RBAC Model

```
User → UserRoleAssignment → Role → RolePermission → Permission
```

Roles: `UNIVERSITY_ADMIN`, `DEAN`, `HOD`, `LECTURER`, `STUDENT`, custom

Permissions: granular strings (e.g., `document:read`, `question:approve`, `user:manage`)

## Monitoring Stack

- **Prometheus**: scrapes `/metrics` every 15s
- **Grafana**: dashboards auto-provisioned from `monitoring/grafana/`
- **Metrics exposed**: HTTP latency, error rate, AI generation time, WebSocket connections, queue depth, DB query time, Node.js runtime (heap, CPU, event loop)
- **Sentry**: exception tracking for both frontend (React error boundaries) and backend (global error handler)
