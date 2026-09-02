# Project-Based Dynamic Enquiry Widget — Implementation Plan

**Goal:** Single reusable `Project Widget` in Template Builder that lists org projects, lets visitor click → dynamic enquiry popup (configurable fields) → creates `Lead` linked to `Project` + assigned sales team visibility (admin sees all, assigned users see only their projects). Fully DB-driven, no hardcoded JSON.

**Stack:** NestJS + Prisma `multiSchema` (identity/projects/templates) + Next.js builder (`Canvas`, `SiteConfig.form`, `LeadSubmission`).

---

## 1. Context & Gaps

- No `project` widget exists. RE widgets (`unit-types`, `pricing`, etc.) are static via `{{property_name}}` placeholders, not live `Project` rows (`frontend/lib/prestate/data.ts: WIDGETS ~42`).
- Form is page-scoped: `LandingPage.content.config.form.fields: FormLeadField[]` (`frontend/lib/prestate/types.ts`), no org-wide form config. Editor mutates `SiteConfig.form` per page.
- Lead is page-scoped: `Lead {orgId, landingPageId, data Json, status, assignedToId}` (`backend/prisma/schema.prisma:751` templates schema). No `projectId`. Creation via `POST /org/leads` unguarded `createFromPublic(dto:{landingPageId,formName,source,data})` → derives `orgId` from `landingPage.orgId` (`backend/src/modules/leads/leads.service.ts:20`). Listing is role-scoped: `manager/sales → assignedToId==actor.sub` else admin sees all (`leads.service.ts: list()`), hard `take:200`, no filters.
- Project sales assignment via `ProjectSalesAgent` m2m (`projects` schema) + `PUT /org/projects/:id/sales-agents` (`backend/src/modules/projects/projects.service.ts: setSalesAgents`).
- Leads inbox (`frontend/app/org/leads/page.tsx`) is unfiltered, search input static, no project column. Project leads subpage (`frontend/app/org/projects/[id]/leads/page.tsx`) is hardcoded mock.

**Decision:** Add nullable `Lead.projectId` FK (`templates` → `projects`, `SET NULL`, indexed) for queryability. Alternative storing in `data.projectId` rejected (not indexable/filterable). Public capture will accept `projectId` alongside `landingPageId`; org is derived from either and must match if both supplied.

---

## 2. Data Model

### 2.1 Prisma Schema (`backend/prisma/schema.prisma`)
```prisma
model Lead {
  projectId String?  @map("project_id")
  project   Project? @relation(fields:[projectId], references:[id], onDelete: SetNull)
  @@index([projectId])
}
model Project {
  leads Lead[] // back-relation, no DB column
}
```
- Cross-schema FK allowed (`templates.leads → projects.projects`). Keep nullable for legacy leads.
- Migration: `ALTER TABLE "templates"."leads" ADD COLUMN "project_id" TEXT REFERENCES "projects"."projects"("id") ON DELETE SET NULL; CREATE INDEX "leads_project_id_idx" ON "templates"."leads"("project_id");`
- Run `npx prisma generate` + `npx prisma migrate dev --name add_lead_project`.

### 2.2 DTOs
- `CreateLeadDto` (`backend/src/modules/leads/dto/create-lead.dto.ts`): add `@IsOptional() @IsUUID() projectId?: string`.
- New `ListLeadsQueryDto`: `projectId?:UUID, status?:LeadStatus, source?:string, assignedToId?:UUID, search?:string, page?:int, limit?:int (default 20, max 100)`.
- `AssignLeadDto` unchanged.

### 2.3 Seed
- Extend `backend/prisma/seed.ts` to create 2 projects for demo org and set sales agents (already done for `shubham` org). Ensure leads seeded with `projectId` where applicable.

---

## 3. Backend

### 3.1 `backend/src/modules/leads/leads.service.ts`
- `createFromPublic(dto)`:
  - If `!landingPageId && !projectId` → 400.
  - Resolve `orgId`: if `landingPageId` → `findUnique landingPage.orgId`; if `projectId` → `findUnique project.orgId`; if both → assert equal else 400.
  - If `projectId` → verify `project.findFirst({id:projectId, orgId})` else 400 `Project not in organisation`.
  - Create `lead {orgId, landingPageId, projectId, data, source, formName}`.
  - Optional auto-assign: if `projectId` and project has `salesAgents`, do not auto-assign yet (keep manual) OR if `Project.marketing.roundRobinEnabled` → pick round-robin (future). For v1, leave unassigned; visibility handles it.
- `list(orgId, actor, query)`:
  - Build `where: Prisma.LeadWhereInput`.
  - Role scope: if `actor.roles` includes `admin`/`super_admin` → `{orgId}`; else if `manager`/`sales` → user can see leads where `assignedToId==actor.sub OR projectId IN (projectIds where user in ProjectSalesAgent OR managerId==actor.sub)`. Simplest v1: `OR: [{assignedToId: actor.sub}, {project: {salesAgents: {some:{userId: actor.sub}}}}, {project:{managerId: actor.sub}}]` + `orgId` AND. If no project link, falls back to assigned only.
  - Apply filters: `projectId`, `status`, `source`, `assignedToId`, `search` (`OR: [{data->>'fullName' contains}, {data->>'phone' contains}, {formName contains}]` via `Prisma.Json` → use raw `contains` on `data` stringified or add `search` over `formName` + `data` path with `mode:insensitive` for text fields if stored searchable; fallback to `formName` + client filter, but prefer `prisma.lead.findMany` with `OR` on `data` using `path` query if postgres jsonb).
  - Pagination: `skip=(page-1)*limit, take=limit`, `orderBy:{createdAt:'desc'}`, `include:{assignedTo, project:{select:{id,name}}}`. Return `{data, total, page, limit}`.
- Add `getById(orgId, id, actor)` with same visibility check + include.
- `listAssignableUsers` unchanged.

### 3.2 `backend/src/modules/leads/leads.controller.ts`
- `POST /org/leads` stays unguarded (public visitors). Accepts new `projectId`.
- `GET /org/leads` (`JwtAuthGuard, OrgApprovedGuard`): `@Query() query: ListLeadsQueryDto` → `service.list(...)`.
- Add `GET /org/leads/:id` (`JwtAuthGuard, OrgApprovedGuard`) → `service.getById`.
- Keep `PATCH :id/assign` admin-only. Optionally add `GET /org/projects/:id/leads` alias → reuse `list` with `projectId`.

### 3.3 `backend/src/modules/projects/projects.service.ts` (minor)
- `getById` include `_count.leads` for badge counts.
- Ensure `list` can be called publicly for widget? No — widget data fetched via authenticated `GET /org/projects` (builder is logged-in org user). For public site rendering, projects are embedded at publish time (see §5), so no public project endpoint needed. If live fetch desired, add `GET /public/projects?orgId` tenant-safe, but avoid exposing.

### 3.4 Guards & Audits
- `OrgApprovedGuard` still applies to list. Public create bypasses.
- Audit: `project_sales_agents_set`, `lead_created` already logged.

---

## 4. Frontend — Types & API (`frontend/lib/`)

### 4.1 `frontend/lib/types.ts`
- `LeadSubmission {landingPageId?:string, projectId?:string, formName?:string, source?:string, fields: Record<string,unknown>}`
- `CrmLead {id, orgId, landingPageId, projectId, project?:{id,name}|null, formName, source, data, status, assignedTo, createdAt}`
- `Project` already exists.

### 4.2 `frontend/lib/api.ts`
- `submitLead(input)` include `projectId`.
- `getCrmLeads(params?:{projectId,status,source,assignedToId,search,page,limit})` builds `?projectId=&status=...` querystring.
- Add `getCrmLead(id)` → `GET /org/leads/:id`.
- Keep `getOrgProjects()` existing (`GET /org/projects`).

### 4.3 Builder Data (`frontend/lib/prestate/`)
- `frontend/lib/prestate/data.ts`: add `project` widget:
  ```ts
  {id:'project', label:'Project', category:'Real Estate', group:'Real Estate', icon: Building2,
   desc:'Dynamic project list — select a project, click opens enquiry form',
   make: ()=> sec('project','Project','Building2',{selectedProjectId:null, layout:'grid', columns:3, showFilters:true, enquiryFormId:null, cardStyle:'classic'})}
  ```
  `WIDGETS` filter already hides `hidden` widgets.
- `frontend/lib/prestate/widget-designs.ts`: add `project:[grid,list,carousel]` designs.
- `frontend/lib/prestate/types.ts`: extend `SectionInstance.settings` union for `project` type; add `SiteConfig.form.projectId?` (hidden field) for per-form default project.
- `frontend/lib/prestate/site-config.ts`: `ensureConfig` hydrates new widget defaults via migration.

### 4.4 Forms Store
- No new org-wide table. Per-page `SiteConfig.form` remains source of truth. For dynamic enquiry, the widget will inject `projectId` as hidden field at submit time, not as a visible form field. Optionally add `FormFieldType='hidden'` usage.

---

## 5. Builder & Rendering

### 5.1 `frontend/components/prestate/builder/widgets-panel.tsx`
- New widget appears in Real Estate category, draggable `widget:project`.

### 5.2 `frontend/components/prestate/builder/canvas.tsx`
- Add `case 'project':` renderer:
  - Fetch projects via `useOrgProjects()` (SWR/React Query, cached `GET /org/projects?limit=100`).
  - Settings: `selectedProjectId` (dropdown of `orgProjects.map(p=>({value:p.id,label:p.name}))`), `layout` (grid/list/carousel), `columns`, `cardStyle`.
  - Display: if `selectedProjectId` → render single project card (coverImage, name, location, price range, amenities) + `Enquire Now` button; if null → render grid of all org projects (each card clickable).
  - Click handler: opens enquiry popup. In builder `live` mode show disabled preview; in public `live` true opens modal.
  - Submit: `submitLead({landingPageId: pageId, projectId: selectedProjectId ?? clickedProjectId, formName: config.form.name, source:'project-widget', fields: formData})` → `firePrestateLead()` + `bumpTracking`.
- Enquiry modal: reuse `GatedDownloadModal`/`GateForm` pattern or new `ProjectEnquiryModal`:
  - Loads `SiteConfig.form.fields` via `ensureConfig(page).form` (or widget-specific `enquiryFormId` → `forms-store.ts` library).
  - Dynamic field rendering with `isFieldVisible` logic + validation (`isValidEmail/Phone`).
  - Hidden input `projectId` auto-injected.
  - On success → show `thankYouPage` or inline `successMessage`.

### 5.3 `frontend/components/prestate/builder/settings-panel.tsx`
- For `type==='project'` show Content tab: Project selector, layout picker, card style, Enquiry Form selector (link to Forms module). Style tab reuses `widgetDefaultStyle`.

### 5.4 Public Site (`frontend/app/p/[slug]/page.tsx`, `frontend/app/__host/[...host]/page.tsx`, `frontend/components/prestate/live-site.tsx`)
- No extra fetch. `LandingPage.content` already contains `sections` with `project` widget settings + `config.form`. At publish time, project snapshot (name/image) could be baked, but to stay DB-driven, the public Canvas will fetch projects live via `GET /public/site/...?includeProjects` OR keep widget settings as `projectId` and fetch via client-side `GET /org/projects` (not public). Recommended: at publish, store `projectId` only; public page fetches project details via new `GET /public/projects/:id` (public, org-scoped via landingPage org) for freshness. Alternative v1: embed project card data at publish time (snapshot) and rehydrate on next publish.
- Add `GET /public/projects/:id` (optional) → `projects.service.getById` with org isolation via landingPage lookup.

### 5.5 Persistence (`frontend/lib/prestate/persist.ts`)
- `migrateSections` handles `project` widget (no migration needed).
- `patchLandingPage` already persists `content:{sections,config}`; no change.

---

## 6. Leads Inbox & Permissions

### 6.1 `frontend/app/org/leads/page.tsx`
- Add filters: Project dropdown (`GET /org/projects` → options + `All Projects`), Status, Source, Search input wired to `getCrmLeads({projectId, search, status})` debounced 300ms, pagination.
- Columns: add `Project` ( `lead.project?.name ?? '-'` ).
- Visibility: `isOrgAdmin()` → full list + assign controls; else list already scoped server-side to assigned projects (see §3.1). Show `Assigned to you` subtitle.

### 6.2 `frontend/app/org/projects/[id]/leads/page.tsx`
- Replace hardcoded mock with `getCrmLeads({projectId:id})`. Reuse same assignment/status handlers but scoped. Show stats derived from API `total`.

### 6.3 `frontend/app/org/leads/[id]/page.tsx`
- Replace mock with `getCrmLead(id)` + timeline (`callLogs`, `activityEvents`). Keep existing layout.

---

## 7. End-to-End Flow (Expected Flow → Implementation)

1. **Organisation → Projects:** Admin creates projects via `POST /org/projects` + `PUT :id/sales-agents` (existing wizard).
2. **Template Builder → Select Project Widget:** Builder user drags `Project` widget, picks `selectedProjectId` from dropdown (or leaves null for all).
3. **Visitor Clicks Project:** Public Canvas renders card(s); click opens `ProjectEnquiryModal` with `SiteConfig.form` fields (configurable per page via Forms module).
4. **Dynamic Enquiry Popup:** Fields driven by `config.form.fields` (org admin configures in Builder → Forms module, stored per `LandingPage.content.config`).
5. **Lead Created:** `submitLead({landingPageId, projectId, fields})` → `POST /org/leads` → `Lead {orgId, landingPageId, projectId, data}`.
6. **Assigned Sales Team Can View:** `GET /org/leads?projectId=` with role-scoped `where` (admin sees all in org, sales/manager sees only leads for projects they're `managerId` or `ProjectSalesAgent`).
7. **Org Admin manages:** `GET /org/leads` (no filter) + `PATCH :id/assign` to reassign.

---

## 8. File Touch List

| Area | File | Change |
|------|------|--------|
| DB | `backend/prisma/schema.prisma` | Add `Lead.projectId` + `Project.leads` relation |
| DB | `backend/prisma/migrations/*_add_lead_project/migration.sql` | FK + index |
| Backend DTO | `backend/src/modules/leads/dto/create-lead.dto.ts` | add `projectId` |
| Backend DTO | `backend/src/modules/leads/dto/list-leads-query.dto.ts` (new) | query params |
| Backend Svc | `backend/src/modules/leads/leads.service.ts` | create + list + getById with project scope |
| Backend Ctrl | `backend/src/modules/leads/leads.controller.ts` | query passthrough + getById |
| Backend Proj | `backend/src/modules/projects/projects.service.ts` | include leads count |
| Frontend types | `frontend/lib/types.ts` | LeadSubmission/CrmLead project fields |
| Frontend api | `frontend/lib/api.ts` | submitLead + getCrmLeads params + getCrmLead |
| Frontend data | `frontend/lib/prestate/data.ts` | register `project` widget |
| Frontend designs | `frontend/lib/prestate/widget-designs.ts` | project designs |
| Frontend types | `frontend/lib/prestate/types.ts` | Project widget settings type |
| Builder | `frontend/components/prestate/builder/canvas.tsx` | project renderer + modal |
| Builder | `frontend/components/prestate/builder/settings-panel.tsx` | project settings UI |
| Builder | `frontend/components/prestate/builder/widgets-panel.tsx` | auto (via WIDGETS) |
| Leads UI | `frontend/app/org/leads/page.tsx` | filters, project column, pagination |
| Leads UI | `frontend/app/org/projects/[id]/leads/page.tsx` | replace mock with real fetch |
| Leads detail | `frontend/app/org/leads/[id]/page.tsx` | replace mock |
| Public | `backend/src/modules/public-site/*` (optional) | `GET /public/projects/:id` for live project data |

**No changes:** `OrgCatalogOption`, `Role`, guards (reuse existing).

---

## 9. Alternatives Considered

- **Store `projectId` in `Lead.data` JSON only:** rejected — not indexable, can't filter `WHERE projectId`, role scoping would require JSON path queries.
- **Org-wide `FormFieldConfig` table:** rejected for v1 — page-scoped `SiteConfig.form` already configurable and dynamic; org-wide would add migration + UI without clear benefit. Can add later as `Organisation.formConfig Json`.
- **LandingPage `projectId` column:** considered but widget supports multiple projects per page (grid), so lead's project must be per-submission, not per-page.

---

## 10. Risks & Mitigations

- **Cross-schema FK (`templates` → `projects`):** Prisma supports multiSchema FK; ensure migration order (`projects` schema exists before `templates.leads` FK). Mitigate via `SET NULL` and nullable column.
- **Search over `data` JSON:** Postgres `data->>'fullName'` requires raw query; fallback to `formName` + in-memory if complexity high. Mitigate by also storing `leadName` denormalized later if needed.
- **Public project fetch:** avoid leaking org projects to other orgs — always scope via `landingPage.orgId`.
- **Builder performance:** `GET /org/projects` cached; debounce lead list filters.

---

## 11. Verification

- **Backend:** `npx prisma migrate dev`, `npx prisma generate`, `npm test` (`leads.service.spec.ts` add cases: create with projectId valid/invalid org, list scoped for sales vs admin, search, pagination), manual `POST /org/leads {landingPageId, projectId, data}`, `GET /org/leads?projectId=`, `GET /org/leads` as sales user (should only see assigned project leads).
- **Frontend:** Builder drag `Project` widget, select project, publish, visit `/p/[slug]` → click card → modal opens with dynamic fields → submit → row appears in `/org/leads` (admin) and `/org/projects/[id]/leads` + assigned sales user's inbox, not unassigned user's. Test `selectedProjectId=null` (grid of all) vs single select.
- **Seed:** `npx prisma db seed` then `GET /org/projects` returns 2+ projects for `shubham` org.
- **Regression:** existing lead capture (non-project `lead-form`) still creates leads without `projectId`.

---

## 12. Effort Estimate

- DB + backend: 3–4h
- Frontend widget + modal: 6–8h
- Leads inbox filtering + permissions: 3h
- Public rendering + polish: 2h
- Tests + migration: 2h

**Total ~16h.** Phased: Phase 1 (DB+API) → Phase 2 (Widget+Modal) → Phase 3 (Inbox+Permissions).

---

## 13. Open Questions

- Auto-assign new project leads to `ProjectSalesAgent` round-robin vs leave unassigned for admin to assign? Recommend v1 manual, v2 round-robin worker reading `Project.marketing.roundRobinEnabled`.
- Should enquiry form be per-widget or per-page? Recommend per-page (`SiteConfig.form`) for v1 (existing), widget just injects `projectId`.
- Need per-org custom form fields UI beyond page `Forms` module? If yes, add `Organisation.formFields Json` later.

