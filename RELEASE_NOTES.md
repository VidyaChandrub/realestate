# Release Notes — v0.1.0

Initial release of the BigEstate real estate SaaS platform (monorepo).

## What's included

### Backend (`backend/`)
- NestJS 11 API with TypeScript
- Prisma ORM against **PostgreSQL 16.8** (local, port `5432`)
- Multi-schema Prisma setup (`identity`, `access`, `templates`, `audit`)
- Migrations applied and seed run (4 roles + Super Admin)
- Enterprise folder structure:
  - `src/common/` — shared guards, decorators, types, utils
  - `src/database/` — PrismaModule + PrismaService
  - `src/modules/` — feature modules (`auth`, `team`) with `dto/` subfolders
- Auth: signup, login, refresh, logout (JWT + hashed refresh tokens)
- Team: invite members with temporary password

### Frontend (`frontend/`)
- Next.js 16.3.1 (App Router), React 19, TypeScript, Tailwind CSS 4, ESLint
- Testing with Vitest + React Testing Library (`npm test`)

## Getting started

### 1. PostgreSQL
PostgreSQL 16.8 is installed portably at `C:\laragon\bin\postgresql\pgsql`.
Cluster data lives at `C:\laragon\bin\postgresql\pgsql\data`.

Start (if not already running):

```powershell
& "C:\laragon\bin\postgresql\pgsql\bin\pg_ctl.exe" -D "C:\laragon\bin\postgresql\pgsql\data" -l "C:\laragon\bin\postgresql\pgsql\data\server.log" start
```

Credentials: user `postgres`, password `postgres`, database `bigestate`.

### 2. Backend

```powershell
cd backend
npm install          # first time only
npm run start:dev    # http://localhost:3000
```

- `.env` is already created from `env.example` (DATABASE_URL points at `localhost:5432/bigestate`).
- To reset the database from scratch: `npx prisma migrate reset` (re-applies migrations and seed).

### 3. Frontend

```powershell
cd frontend
npm install          # first time only
npm run dev          # http://localhost:3001 (or next available)
```

## Scripts

| App      | Command              | Purpose                         |
|----------|----------------------|---------------------------------|
| backend  | `npm run start:dev`  | Dev server with watch mode      |
| backend  | `npm run build`      | Production build                |
| backend  | `npm test`           | Unit tests (Jest)               |
| frontend | `npm run dev`        | Dev server                      |
| frontend | `npm run build`      | Production build                |
| frontend | `npm test`           | Unit tests (Vitest)             |

## Seeded credentials

- Super Admin: `admin@bigestate.io` / `changeme-before-first-deploy`
