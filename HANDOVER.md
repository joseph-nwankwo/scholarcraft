# ScholarCraft — Handover Document

## Project Overview

ScholarCraft is the **student-facing** AI companion in UAMSATech's Craft Suite. It is the sibling product to LectureCraft (which serves educators). Students use ScholarCraft for study planning, GPA tracking, plagiarism & AI detection, thesis writing assistance, and class collaboration.

**Owner:** Prevail Nwankwo (josephnwankwo56@gmail.com)
**Last updated:** 2026-07-25
**Status:** Scaffold complete — dev servers running, shared database wired, SSO implemented.

---

## Running the Project

```bash
# Root of C:\Users\MY PC\Desktop\Apps\ScholarCraft
npm run dev
```

| Service  | URL                          | Notes                          |
|----------|------------------------------|--------------------------------|
| Frontend | http://localhost:3002        | Vite dev server                |
| Backend  | http://localhost:4001        | Express + ts-node via nodemon  |
| Health   | http://localhost:4001/health | Returns `{ app: "ScholarCraft" }` |

> **Do NOT run `npm install` in `backend/`** — it triggers `@prisma/engines` postinstall which fails with ECONNRESET (network blocks the binary download). The `backend/node_modules` was copied directly from LectureCraft (identical dependencies). If you ever need to reinstall the backend, copy `node_modules` from `C:\Users\MY PC\Desktop\Apps\LectureCraft\backend\node_modules` again rather than fresh-installing.

Frontend can be reinstalled normally: `npm install --prefix frontend`.

---

## Architecture

```
ScholarCraft/
├── backend/          Node.js + Express + TypeScript + Prisma
│   ├── src/
│   │   ├── app.ts            ← Main entry — only student routes registered
│   │   ├── routes/           ← Many files here; only ~10 are imported in app.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── gateway/          ← Socket.IO
│   │   └── workers/          ← billing.worker only (Redis-optional)
│   └── prisma/schema.prisma  ← Points to craftsuite; schema mirrors LectureCraft
│
└── frontend/         React 18 + TypeScript + Vite + Tailwind + shadcn/ui
    └── src/
        ├── app/router/routes.tsx     ← Active route tree (student pages only)
        ├── constants/routes.ts       ← All ROUTES constants
        ├── features/                 ← Many dirs; only student ones are wired
        ├── layouts/AppLayout/        ← Sidebar + MobileNav (ScholarCraft branded)
        └── lib/api/client.ts         ← Points to http://localhost:4001/api
```

---

## Environment

### Backend (`backend/.env`)
```
PORT=4001
DATABASE_URL=postgresql://postgres:<your-password>@localhost:5432/craftsuite
JWT_ACCESS_SECRET=craft-suite-shared-access-secret-uamsatech-platform-2026-change-in-prod
JWT_REFRESH_SECRET=craft-suite-shared-refresh-secret-uamsatech-platform-2026-change-in-prod
FRONTEND_URL=http://localhost:3002
SMTP_FROM=ScholarCraft <noreply@scholarcraft.app>
OPENAI_API_KEY=<key>
ANTHROPIC_API_KEY=<key>
```

**Critical notes:**
- Database: **`craftsuite`** — shared with LectureCraft. **Do not change back to `scholarcraft`.**
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must match LectureCraft exactly — they are the Craft Suite shared secrets used for cross-product SSO token verification.
- `SMTP_FROM` is explicitly set to ScholarCraft branding to avoid defaulting to LectureCraft's branding.
- Redis is optional — billing workers silently disable themselves if Redis is unavailable.

### Frontend (`frontend/vite.config.ts`)
- Port: **3002** (`strictPort: true` — will error if in use; kill old process first)
- API proxy: `/api` → `http://localhost:4001`

---

## Auth & Cookies

| Cookie | Name | Notes |
|--------|------|-------|
| Refresh token | `sc_refresh` | HttpOnly, path `/api/auth` |
| Access (legacy header) | `sc_access` | Read by auth middleware (not set by default) |

Both names were previously wrong (copied from LectureCraft as `lc_refresh` / `lc_access`). Fixed in:
- `src/controllers/auth.controller.ts` — `REFRESH_COOKIE = 'sc_refresh'`
- `src/middleware/auth.middleware.ts` — reads `req.cookies?.sc_access`

---

## SSO (Single Sign-On) from uamsatech.com

ScholarCraft participates in the Craft Suite SSO flow initiated from the uamsatech.com portal.

### Flow

1. User logs into uamsatech.com portal
2. Clicks "Launch ScholarCraft" → navigates to `/portal/launch/scholarcraft`
3. uamsatech.com signs a 5-minute launch token: `{ sub, email, type: "product_launch", target: "scholarcraft" }`
4. Redirects to `http://localhost:4001/api/auth/sso?token=<token>`
5. ScholarCraft backend verifies token with shared `JWT_ACCESS_SECRET`
6. Finds or creates the user (`role: STUDENT`, `password: ''`, `emailVerified: true`)
7. Issues ScholarCraft access + refresh tokens
8. Redirects to `http://localhost:3002/auth/sso?at=<accessToken>&rt=<refreshToken>`
9. Frontend `SsoPage` saves tokens to localStorage and navigates to `/dashboard`

### Backend SSO endpoint
`GET /api/auth/sso` — implemented in `src/controllers/auth.controller.ts` as `ssoCallback`

Route registered in `src/routes/auth.routes.ts` **before** public routes:
```typescript
router.get('/sso', authController.ssoCallback)
```

SSO auto-created users have `role: STUDENT` and `password: ''` — they cannot log in via the normal login form; they use the SSO flow from uamsatech.com.

---

## What Was Built

ScholarCraft was scaffolded from LectureCraft on 2026-07-16 and adapted as follows:

### Files rewritten for ScholarCraft
| File | What changed |
|------|-------------|
| `backend/src/app.ts` | Stripped to student routes only: auth, users, institutions, billing, plagiarism, student, enrollments, submissions, ai, metrics |
| `backend/src/utils/logger.ts` | Service name: `scholarcraft-api` |
| `backend/.env` | Port 4001, `craftsuite` DB, shared JWT secrets, `SMTP_FROM` fixed |
| `frontend/vite.config.ts` | Port 3002, proxy to 4001 |
| `frontend/src/lib/api/client.ts` | BASE_URL → `http://localhost:4001/api` |
| `frontend/index.html` | Title → ScholarCraft |
| `frontend/src/constants/routes.ts` | Student-only routes |
| `frontend/src/app/router/routes.tsx` | Student route tree |
| `frontend/src/layouts/AppLayout/Sidebar.tsx` | "SC" branding, student nav sections |
| `frontend/src/layouts/AppLayout/MobileNav.tsx` | Same — mobile drawer version |
| `package.json` | name: scholarcraft |
| `backend/package.json` | name: scholarcraft-backend |
| `frontend/package.json` | name: scholarcraft-frontend |

### Pages (student-specific)
| Route | File | Status |
|-------|------|--------|
| `/dashboard` | `features/dashboard/pages/DashboardPage.tsx` | Done — welcome card + quick-links |
| `/study-tools` | `features/study-tools/pages/StudyToolsPage.tsx` | Scaffold — 3 coming-soon cards |
| `/plagiarism-check` | `features/plagiarism/pages/PlagiarismCheckPage.tsx` | Inherited from LectureCraft — needs student wiring |
| `/class-connect` | `features/class-connect/pages/ClassConnectPage.tsx` | Scaffold — join-by-code UI, coming soon |
| `/thesiscraft` | `features/thesiscraft/pages/ThesisCraftPage.tsx` | Scaffold — 3 disabled module links |
| `/settings` | `features/settings/pages/SettingsPage.tsx` | Has lecturer-specific Grading System tab — remove |
| `/billing` | `features/billing/pages/BillingPage.tsx` | Functional but plan names are lecturer-focused |

### Navigation structure
```
Main        → Dashboard
AI Tools    → Study Tools | Plagiarism & AI Check | ThesisCraft
Class       → Class Connect
System      → Settings
```

---

## Active Backend Routes

| Mount | Route file | Notes |
|-------|------------|-------|
| `/api/auth` | auth.routes.ts | Login, register, refresh, SSO callback |
| `/api/users` | users.routes.ts | Profile, avatar |
| `/api/institutions` | institutions.routes.ts | Institution lookup |
| `/api/billing` | billing.routes.ts | Stripe/Paystack billing |
| `/api/plagiarism` | plagiarism.routes.ts | AI detection — rate limited |
| `/api/student` | student.routes.ts | Student-specific endpoints |
| `/api/enrollments` | enrollment.routes.ts | Course enrollment |
| `/api/submissions` | submissions.routes.ts | Assignment submissions |
| `/api/ai` | ai.routes.ts | General AI endpoints |
| `/metrics` | metrics.routes.ts | Internal metrics |

The `routes/` directory contains ~30 other files inherited from LectureCraft — they are **not imported** in app.ts and therefore **not active**.

---

## Database

- Database name: **`craftsuite`** (shared with LectureCraft — do not create a separate `scholarcraft` DB)
- ORM: Prisma v6.19.3
- Schema: `backend/prisma/schema.prisma` — mirrors LectureCraft's master schema
- The authoritative/master schema lives at `C:\Users\MY PC\Desktop\Apps\LectureCraft\backend\prisma\schema.prisma`. If you add new ScholarCraft models, add them there first, push to `craftsuite`, then copy the schema here.

### Useful commands
```bash
# Re-generate Prisma client after schema change
cd backend && npx prisma generate

# Push schema changes to DB (dev — no migration history)
cd backend && npx prisma db push --accept-data-loss

# Open Prisma Studio (DB GUI at localhost:5555)
npm run db:studio
```

---

## What Needs to be Done Next

### Priority 1 — Make it student-usable
- [ ] **Settings cleanup**: Remove the "Grading System" tab from `features/settings/pages/SettingsPage.tsx` — that is a lecturer feature.
- [ ] **Plagiarism page**: Verify `features/plagiarism/pages/PlagiarismCheckPage.tsx` calls `/api/plagiarism` correctly from a student's perspective.
- [ ] **Billing plans**: Update plan names from lecturer tiers to student tiers: Free / Essential / ThesisCraft Official.

### Priority 2 — Build student features
- [ ] **Study Tools**: Implement Flashcard creator, AI summarizer, AI Quiz Practice. Backend models (`StudySubject`, `StudyTask`, `StudySession`) are already in `craftsuite` DB.
- [ ] **GPA Calculator**: Models (`GpaSemester`, `GpaCourse`) are already in `craftsuite` DB.
- [ ] **ThesisCraft link**: The `/thesiscraft` page in ScholarCraft should deep-link into the standalone ThesisCraft app (http://localhost:5173) or embed key features.
- [ ] **Class Connect**: Student joins class by code (instructor creates the class in LectureCraft). Backend enrollment logic needed in `enrollment.routes.ts` / `enrollment.controller.ts`.

### Priority 3 — Clean up inherited LectureCraft code
- [ ] **Frontend features folder**: Many feature directories are LectureCraft-specific and unreachable — delete when confident they're not needed.
- [ ] **Backend routes folder**: Delete the unused route files (academic, analytics, assessments, collaboration, etc.) to keep the codebase clean.

---

## Relationship to LectureCraft & Craft Suite

| Aspect | uamsatech.com | LectureCraft | ScholarCraft | ThesisCraft |
|--------|--------------|-------------|--------------|-------------|
| Users | All (platform login) | Educators | Students | All (research) |
| Backend port | — | 4000 | 4001 | 4002 |
| Frontend port | 3000 | 3001 | 3002 | 5173 |
| Database | uamsatech | craftsuite | craftsuite (shared) | thesiscraft |

SSO: uamsatech.com → signs launch token → LC/SC backend verifies → issues product session.

---

## Known Issues & Gotchas

1. **`npm install` in `backend/` fails** with ECONNRESET on `@prisma/engines`. Copy node_modules from LectureCraft's backend instead.

2. **Port 3002 already in use** if you try to start the dev server twice. Kill it first:
   ```powershell
   Get-Process -Id (Get-NetTCPConnection -LocalPort 3002).OwningProcess | Stop-Process -Force
   ```

3. **Redis not available** — billing workers log a warning on startup but the app continues normally.

4. **SSO auto-created users** have `password: ''` and cannot log in via normal login form — they always use the SSO flow from uamsatech.com.

---

## Tech Stack Reference

**Backend:** Node.js v24 + TypeScript, Express 5, Prisma 6, PostgreSQL, Socket.IO, Winston, Redis (optional)

**Frontend:** React 18, TypeScript, Vite 8, Tailwind CSS v4, shadcn/ui, React Router v7, TanStack Query, Zustand, React Hook Form + Zod
