# Project Handoff

This document is a from-scratch orientation to this codebase, written by reading the actual code and git history rather than any design docs (there aren't any). Where a claim is about behavior, it's traced to the file that implements it. Where something couldn't be verified or looks inconsistent, that's said outright instead of guessed at.

The repo currently has two names on it: the seed data and `RELEASE_NOTES.md` call the product **BigEstate**; almost everywhere else — the deploy workflow's own header comment, environment defaults (`ipixxel.ae`), and the bulk of in-app strings — call it **iPixxel Realty**. "iPixxel" wins by a wide margin in the actual code (46 references vs. 4 for "BigEstate"), so treat BigEstate as an old name that didn't get fully cleaned up.

Branch note: everything below describes `main` / `vidya_new`, which point at the same commit (`3379ab1`) as of this writing. There is a third branch, `vidya`, that diverged earlier and contains work that was never merged — most importantly a `TeamUnit` model and a team-based visibility rewrite (see the Teams section and the "Two things you asked about" section below). Don't assume anything on `vidya` is live.

---

## 1. What the product is

It's a multi-tenant real-estate SaaS: real-estate developers, brokers, and channel partners ("organisations") sign up, get a subdomain (and optionally a custom domain), list projects and units, publish marketing landing pages to capture leads, and run those leads through a lightweight CRM. A platform operator (iPixxel) runs the whole thing centrally — onboarding orgs, managing the plan catalog, curating a shared template library, approving custom domains, and handling support tickets.

**Roles** (`backend/prisma/schema.prisma` `Role` model, seeded in `backend/prisma/seed.ts`):
- `super_admin` — platform operator, unrestricted, lives outside any organisation.
- `admin` — an organisation's own admin, unrestricted *within* that org.
- `manager` / `sales` / `telecaller` — team-scoped roles with real, enforced, granular permissions (see §4.8).
- Custom roles — an org admin can define additional roles with their own permission grants via the Permissions module.

An organisation also has an `industry` classification (`developer` / `broker` / `channel` / `mixed`), stored against a DB-backed `OrgType` lookup table so Super Admin can relabel it without a deploy (`schema.prisma:92-99`).

**Core flow, end to end:**
1. Someone signs up (2-step wizard, no approval needed — see §4.1) and lands on the seeded "Basic" plan automatically.
2. They set up projects, unit inventory, and a landing page (either blank or copied from an admin-curated template).
3. They publish the landing page, which becomes reachable at their org's subdomain or connected custom domain (traced fully in §7.1).
4. Visitors fill in a lead-capture form on that page; the lead lands in the org's CRM inbox.
5. Leads get worked by managers/sales/telecallers, scoped by direct project/unit assignment (not by team — see §7.2 for why that matters).
6. The org's usage against its plan's quotas (projects, users, templates, landing pages) is enforced server-side at every relevant create path; billing itself is internal bookkeeping, not a payment gateway (§4.2).

---

## 2. Stack and repo layout

Monorepo, two apps, no shared package:

- **`backend/`** — NestJS 11 + TypeScript, Prisma 6 ORM over PostgreSQL 16, multi-schema (`identity`, `access`/`billing`, `templates`, `projects`, `audit`, …verified in `schema.prisma`'s `@@schema(...)` attributes). ~34 feature modules under `backend/src/modules/`, each the usual Nest `controller` + `service` + `dto/` shape. Shared guards/decorators/utils live in `backend/src/common/`.
- **`frontend/`** — Next.js 16.3.1 (App Router) + React 19 + Tailwind 4. **Important:** this Next.js version renamed `middleware.ts` to `proxy.ts` (confirmed against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — this is a real, documented rename in this Next version, not dead code) — the repo's `frontend/proxy.ts` is the active host-routing layer, not a leftover.
  - `app/org/*` — the organisation's own portal (projects, units, leads, teams, templates, websites, settings, …).
  - `app/admin-console/*` — the Super Admin console (organisations, templates, plans/subscriptions, domains, support, …).
  - `app/(auth)/*` — login/register/onboarding.
  - `app/org-site`, `app/p/[slug]`, `app/__host/[...host]` — public-site rendering, traced in §7.1.
  - `lib/openpage/` + `components/openpage/` — the drag-and-drop page builder ("OpenPage") that both templates and landing pages are edited through.
- **Deploy**: `.github/workflows/deploy.yml` (GitHub Actions → SSH), `docker-compose.prod.yml` (Postgres + API in Docker), `ecosystem.config.cjs` (PM2, for the frontend — see §3).
- Root-level `docs/local-dev.md` already documents one local dev gotcha (the node_modules volume issue, §3.4); this file is meant to sit alongside it.

Frontend and backend talk over `/api/*`, rewritten by `next.config.ts`'s `rewrites()` to `BACKEND_URL` (defaults to `http://127.0.0.1:3000`).

---

## 3. Deployment

### 3.1 Production topology

- **Backend**: runs in Docker, via `docker-compose.prod.yml` — a `postgres:16` container and an `api` container built from `backend/Dockerfile`'s `prod` stage (multi-stage: `npm ci --omit=dev`, `prisma generate`, copies the pre-built `dist/` from the `build` stage). Exposed on port 3000.
- **Frontend**: runs *outside* Docker, directly on the host via PM2 (`ecosystem.config.cjs`), on port 3001, built fresh on every deploy (not containerized).
- Both are fronted by whatever reverse proxy/DNS terminates the actual domains (not part of this repo — see §7.1 for what the app-level code assumes about that).

### 3.2 The deploy pipeline (`.github/workflows/deploy.yml`)

Push to `main` (or manual dispatch) triggers two jobs:
1. **`build-check`** — installs and builds both apps in CI *before touching the server*, specifically because "lockfile drift has broken deploys repeatedly" (the workflow's own comment). Uses `npm ci` (fails loudly on lockfile drift) rather than `npm install`.
2. **`deploy`** — SSHes into the prod host and runs a bash script inline. In order: checks swap is present, `git pull --ff-only`, builds and starts the API's Docker container, runs migrations, stops the frontend PM2 process, rebuilds the frontend, restarts PM2, then curls `localhost:3001` to confirm it's actually serving before declaring success.

### 3.3 Gotchas that have actually bitten this project (all currently mitigated — here's what to know)

**Swap requirement for the frontend build.** The `next build` on the production instance needs more RAM than the instance has; without swap, the OOM killer kills the build partway and leaves a broken `.next/`. The deploy script now hard-fails *before* touching anything if `free -m` shows less than 1GB of swap (`deploy.yml:112-116`), and separately verifies `.next/BUILD_ID` exists after the build finishes as a second check that the build wasn't silently killed (`deploy.yml:147-152`).

**`docker compose exec` eating the deploy script's stdin.** The whole deploy runs as `ssh ... 'bash -s' << 'ENDSSH' ... ENDSSH` — a heredoc piped into the SSH session's stdin. Confirmed in git history (`git log -p -- .github/workflows/deploy.yml`): commit `926c012` first added `docker compose exec -T api npx prisma migrate deploy`, but `-T` (disable pseudo-tty) alone wasn't enough — `exec` still tried to read the *rest of the heredoc script* as its own stdin, which could hang or corrupt the remaining deploy steps. Commit `a10030e` (2026-09-10) fixed it by appending `< /dev/null` (`deploy.yml:136`). If you ever add another `docker compose exec` call inside this same SSH block, it needs the same `< /dev/null`.

**`node dist/prisma/seed.js` instead of `prisma db seed`.** `backend/package.json`'s `prisma.seed` config is `ts-node prisma/seed.ts` — fine in dev, but the prod image (`Dockerfile`'s `prod` stage) runs `npm ci --omit=dev`, which strips `ts-node`/`typescript`. `npx prisma db seed` would fail in that container. The Nest build (`tsconfig.build.json`, which has no `include` restricting it to `src/`) actually compiles `prisma/seed.ts` too, verified by checking a real build output: `backend/dist/prisma/seed.js` exists alongside `backend/dist/src/main.js`. So seeding prod means `docker compose exec api node dist/prisma/seed.js`, not the Prisma CLI. **Note:** the current `deploy.yml` does not run a seed step at all — seeding is a manual, one-time (or as-needed) operation, not part of the automated pipeline.
  - Side note found while verifying this: `ecosystem.config.cjs` (the PM2 config) points the *non-Docker* `realestate-api` app at `dist/main.js`, but the real compiled entrypoint is `dist/src/main.js` (same rootDir-inference issue). This PM2 `api` app looks stale/unused — production actually runs the API via the Docker compose file, not PM2 — but if anyone ever tries `pm2 start ecosystem.config.cjs` for the API, it will fail to find its entrypoint.

**The anonymous `node_modules` volume causing a stale Prisma client.** This is a **local-dev-only** issue (already documented in `docs/local-dev.md`), not a prod one — worth restating here so it isn't confused with the above. `backend/docker-compose.yml` (dev) mounts `.:/app` and shadows it with `- /app/node_modules`, giving the dev container its own `node_modules`/generated Prisma client separate from the host's. Running `prisma generate` on the host does nothing for the running container; you have to `docker exec realestate-api npx prisma generate` after every migration. Production's `docker-compose.prod.yml` doesn't do this — the prod image is a full multi-stage build with `prisma generate` baked in at build time, so this specific failure mode can't happen there.

---

## 4. Module by module: what's built vs. what isn't

### 4.1 Onboarding
Two steps: account, then organisation (`frontend/app/(auth)/(portal)/register/page.tsx`). Confirmed from `98c1a51` ("Simplify onboarding to 2 steps, remove approval gate, add Basic plan") and its follow-through code (`backend/src/common/utils/onboarding-finalize.util.ts`):
- Finishing step 2 **activates the org immediately** — there is no Super Admin approval gate anymore.
- The org is auto-assigned the seeded **"Basic"** plan (`assignBasicPlanIfMissing`, keyed by `Plan.slug === 'basic'`).
- The subdomain is auto-generated server-side, not chosen in the wizard.
- A self-heal path (`finalizeLegacyOnboardingDraft`, called from `OrgApprovedGuard` and login/resume) rescues any user account left stranded on one of the wizard steps that got removed (business details, subscription, templates, modules, invite, connect — their backend routes are commented out, not deleted, "for reversibility," per the same commit).

### 4.2 Plans / billing / subscriptions
**Quota-based, not feature-flag-based**, and this was a deliberate, documented redesign — `backend/src/modules/plans/plan-capabilities.ts:13-14`: *"Seeded from the old hardcoded `ALL_FEATURES` matrix list, minus Projects / Users / Templates (those are numeric `limits`, not booleans)."* So the old model was a flat hardcoded boolean feature matrix; the current `Plan` model (`schema.prisma:870-906`) splits it in two:
- `limits: Json` — `{ projects, users, templates, landingPages }`, each `number | null` (`null` = unlimited).
- `capabilities: Json` — `{ <key>: boolean }` against a fixed catalog (`publishing`, `customDomain`, `whatsappIntegration`, `whiteLabel`, `ssoAndSla`, …) that the frontend fetches from the backend rather than re-declaring, so they can't drift.
- `features: Json` is explicitly commented as **"Marketing bullet strings only — not functional. Not the source of truth for anything."**

Enforcement is real and centralized in `backend/src/common/utils/plan-quota.util.ts`: `assertLimit()` is called at every place that creates a countable resource — project creation, user invites, template assignment, landing page creation — and `assertPlanFitsCurrentUsage()` blocks a downgrade that would put the org over the new plan's limits (it never deletes anything to force a fit; it just rejects the switch).

**No payment gateway anywhere** (verified: no Stripe/Razorpay/PayU/etc. references in the codebase). Billing is internal bookkeeping:
- `SubscriptionLifecycleSweeper` (`backend/src/modules/subscriptions/subscription-lifecycle.sweeper.ts`) is a real in-process hourly timer (`setInterval`, unref'd so it doesn't block shutdown) that runs `applyOrgSubscriptionLifecycle` — transitioning subscriptions through active → past_due (grace period) → expired/cancelled, plus flagging when notifications should fire. The same logic also runs lazily on-demand (e.g. on a billing read or a publish attempt), so the sweep is a safety net, not the only trigger.
- Plan changes go through `package-change-requests`: an org submits a change request (`PackageChangeRequestsService.submitOrgRequest`), which is checked against current usage, and a Super Admin approves or rejects it from the admin console. There's no self-serve instant upgrade with payment — it's a request/approval workflow.

### 4.3 Projects & units
Real CRUD, org-scoped, with media upload support. The notable schema decision — units carrying their own configuration rather than an FK to a unit-type — is covered in §5.

- **Standalone units** (a `Unit` with `projectId: null`) are real — resale/broker listings with no parent project. They get their own `managerId` and `UnitSalesAgent` rows, mirroring `Project.managerId`/`ProjectSalesAgent` one level down, specifically because a standalone unit has no project to inherit access from (`schema.prisma:1605-1610` comment).
- Sales-agent/manager assignment on both projects and standalone units is real and enforced.
- **Four project-detail sub-tabs are entirely fake**, and this is worth knowing before anyone reports them as bugs: `frontend/app/org/projects/[id]/{ai-calling,insights,integrations,knowledge}/page.tsx` are, verbatim from their own header comments, *"Static mockup[s] carried over from the previous hardcoded project folder... out of scope for this build — nothing here is wired to the backend. It exists so the project tab bar doesn't 404."* `ai-calling/page.tsx` in particular renders fabricated call transcripts with invented lead names, durations, and summaries, with **no on-screen indication to the user that it's fake** — only `insights/page.tsx` shows an in-UI disclaimer ("Insights aren't wired up yet — figures below are placeholder data"). If a demo or a new hire clicks into a project's AI Calling tab, what they see is 100% invented.
- **Separately — and bigger — the entire org-level `/org/calling` and `/org/whatsapp` nav sections are also fake, with *no* disclaimer at all.** These are not the same code as the project-detail tabs above; they're a completely separate part of the app (top-level sidebar items, not a project sub-tab), and there's no `calling` or `whatsapp` module anywhere under `backend/src/modules` to back them. At least 12 pages across the two sections (`org/calling/{page,call-logs,ai-agents,campaigns,automations,queue}.tsx`, `org/whatsapp/{page,inbox,ai-agents,automations,settings}.tsx`) render hardcoded arrays of realistic-looking fake data — named leads and phone numbers, call durations and outcomes, WhatsApp conversation threads, named AI voice agents ("AI Aarohi", "AI Kabir", "AI Meher"), campaign performance numbers, approved message templates — with no comment or on-screen banner anywhere saying it isn't real (unlike the project Insights tab above). The two exceptions are `org/calling/numbers` and `org/calling/voice-lab`, which honestly show a plain "coming soon" placeholder instead of fake data. This is also unrelated to the real `CallLog` Prisma model (`@@map("call_logs")` in `schema.prisma`) that `sales-agents.service.ts` genuinely reads for agent performance stats — that table is real and queried for real, but nothing under `/org/calling` reads or writes it; the two "calling" features in this codebase are disconnected from each other. Anyone giving a product tour needs to know this before clicking into either section live.

### 4.4 Teams
CRUD is fully built: create/edit/delete teams, set members (with a per-member role label), set a team lead, assign projects to a team (`TeamProject`, a plain join table). Frontend is complete (`frontend/app/org/teams/{page,create,onboard,[id],[id]/edit}.tsx`).

**But on this branch, nothing actually reads `TeamProject` (or `TeamMember`) to scope visibility.** Grepping the whole backend for `.teamProject` turns up exactly one consumer: `org-teams.service.ts` itself, doing the CRUD. Lead visibility (`backend/src/common/utils/lead-scope.util.ts`) and project/unit visibility are both still resolved from the older direct-assignment columns — `Project.managerId` / `ProjectSalesAgent` and `Unit.managerId` / `UnitSalesAgent` — with zero reference to Team anywhere in that logic. See §7.2 for the full story: this *was* built (team-based visibility, plus a `TeamUnit` model) on a sibling branch that was never merged.

### 4.5 Templates vs. landing pages
Two separate Prisma models (`Template` at `schema.prisma:818`, `LandingPage` at `schema.prisma:1006`), and creating a landing page from a template is a genuine **copy, not a live reference** — confirmed directly in `org-landing-pages.service.ts`'s `create()`: it deep-binds `template.content` into a new `content` JSON blob stored on the `LandingPage` row (`content: bound as Prisma.InputJsonValue`), and keeps `sourceTemplateId` only as a lineage pointer. Editing the source `Template` afterward does not touch any `LandingPage` that was copied from it — the schema comment on `LandingPage.content` says as much: `// { sections, config } — the org's own copy`.

- Both models share the same page-builder ("OpenPage") content shape (`{ sections, config }`), edited through `lib/openpage/` + `components/openpage/`.
- Admins manage the template library (`admin-templates` module — create/edit/reset/assign-to-org, backed by real DB writes, not mocked).
- Orgs can only copy a template that's been explicitly assigned to them (`OrganisationTemplate` join row) — checked server-side in `create()`, never trusted from the client.
- Publishing a landing page (`org-landing-pages.service.ts:370`, `publish()`) is **self-service**, gated only by `assertOrgCanPublish` (an active/trial/in-grace subscription with the `publishing` capability) — there is no Super Admin approval step in the publish path. (The `LandingPage` model does have unused `submittedAt`/`reviewedAt`/`reviewedById`/`rejectionReason` columns that suggest a review workflow was planned or exists for a different flow — not traced further here, but they're not part of `publish()`.)

### 4.6 Leads
A substantial, real CRM module (`leads.service.ts` is ~1,090 lines): capture from published landing-page forms plus manual entry, an inbox with notes, a "next action" field, and assignment. Visibility scoping is the `lead-scope.util.ts` logic described in §4.4/§7.2 — direct project-manager/sales-agent/assignee based, not team-based.

### 4.7 Catalogs
`OrgCatalogOption` (`org-project-catalog` module) is per-org, freeform (category + label), and **genuinely never seeded** — confirmed by grepping both `backend/prisma/seed.ts` and `seed-builder-page.ts` for any catalog population; there is none. Every organisation starts with an empty catalog and has to populate it itself (Settings screen, real CRUD). Catalog values are copied onto `Unit`/`Project` columns as plain strings at creation time and never referenced again by FK — deleting a catalog option is explicitly safe by design for this reason (`org-project-catalog.service.ts:60-63` comment).

### 4.8 Permissions
This is a real, granular, DB-backed system, not just `role === 'admin'` checks:
- A fixed catalog of 16 org-facing modules (`dashboard`, `crm`, `projects`, `websites`, `teams`, `billing`, …) and 15 platform (Super Admin) modules, each with 5 possible actions (`view`/`add`/`edit`/`delete`/`approve`) — `backend/src/common/utils/permissions.util.ts:13-70`.
- Effective permission for a user is resolved in three tiers: an org-specific override row → a platform-seeded system default for that role → a hardcoded fallback (`loadRolePermissions`, same file, lines 450-473).
- `super_admin` and the org's own `admin` role bypass this entirely and always pass (`UNRESTRICTED_ROLES`).
- Enforcement is a real NestJS guard (`PermissionGuard`, `backend/src/common/guards/permission.guard.ts`) driven by a `@RequirePermission(module, action)` decorator, and it's actually applied — found on 19 different controllers across the org-facing modules (projects, leads, teams, billing, settings, users, catalog, domains, support, …), not just declared and ignored.

### 4.9 Domains
Real, not just a status flag flip. An org requests a subdomain or custom domain (`org-domain` module); Super Admin approves/rejects it (`admin-org-domain` module) — that part is a manual decision, not automated. But there's also a genuine live check: `AdminOrgDomainService.verify()` (`admin-org-domain.service.ts:304-376`) uses Node's real `dns.resolve4()` to resolve the actual host, compares it against the platform's configured IP, and reports `live: dnsStatus === 'ok' && Boolean(landingPage)`. So the codebase itself has a built-in "is this actually working for the public" check — which is directly relevant to §7.1.

---

## 5. Settled architectural decisions (and the ones that were reversed)

- **Templates and landing pages are separate models, copy-on-use — and this was tried two other ways first, both reverted.** Covered in §4.5. Migration history shows the design actually moved through three shapes: (1) an original `templates.templates` catalog with `PricingModel`/`PaymentStatus` enums and a `team_template_access` table (a paid-marketplace shape) — dropped in `20260820114532_drop_template_catalog`, replaced with `organisation_landing_page_templates` (org ↔ **LandingPage** — for a period, landing pages themselves doubled as the shareable "templates," with no separate `Template` model at all); (2) that too was dropped in `20260822000000_remove_old_builder`, as part of ripping out the entire old page-builder engine (nicknamed "prestate," later renamed to "openpage" — see `3426180 refactor: migrate prestate references to openpage`); (3) `Template` was reinstated as its own model in `20260824145251_add_org_templates` / `20260824152956_add_template` (commit `ad0c936`) — this is the current, live design. **Don't reintroduce org↔LandingPage-as-template or a live `Template` FK — both were tried and abandoned.** As for *why* copy-on-use specifically: there is a real documented reason, though not the "don't let template edits break published pages" one you might expect — `org-landing-pages.service.ts` (around the thank-you-page copy step) has a comment that the copy exists so that *"ten orgs using the same template must never end up cross-linked to each other's pages"* — i.e. multi-tenant isolation is the stated reason. That copying also happens to protect a published page from a later template edit is a reasonable side-effect, but that specific rationale isn't the one written down in the code.

- **Units carry their own configuration; there is no `UnitType` foreign key.** `Unit.configuration` (`schema.prisma:1570-1574`) is a free string, "validated server-side against the org's catalog on write" but not FK'd. `UnitType` (`schema.prisma:1531-1559`) is a *separate* per-project record for the **planned/marketed unit mix** — e.g., "we're building 40 2-BHKs" — and the schema comment is explicit that this was a deliberate un-linking: *"the available count is NOT stored here — it's derived at read time from the actual Unit rows' status so the two can never drift apart."* Similarly, `Unit.carpetSqft`/`builtupSqft` used to live only on `UnitType` and now live on `Unit` itself ("The unit carries its own areas now (was on UnitType)" — `schema.prisma:1579`), because a project might have 40 planned 2-BHKs that vary in size unit to unit. So `UnitType` is a marketing/summary table for "what we're building," and `Unit` is the actual inventory — separate on purpose so the two can't get out of sync with each other.

- **Quota-based plan pricing, replacing a hardcoded feature matrix.** Covered in §4.2. This is the clearest "reversed decision" in the codebase: the old `ALL_FEATURES` model conflated countable resources (projects, users, templates) with genuine on/off features into one flat boolean list; the current model separates numeric quotas from boolean capabilities. Don't reintroduce a boolean "hasProjects" style flag — countable things belong in `limits`.

- **Catalogs are never seeded.** Covered in §4.7. Deliberate: every org's catalog (unit configurations, facings, parking types, etc.) is genuinely their own vocabulary, not a shared platform list.

- **Visibility was *intended* to flow through teams, but that migration was never merged.** This is the one place where what the codebase clearly *wants* to be true and what's actually true on `main`/`vidya_new` diverge — see §7.2 for the full trace. Don't assume `TeamProject`/`TeamMember` drive access on this branch; they currently don't.

---

## 6. Known gaps and open questions

Being direct about these rather than papering over them:

- **The `/org/calling` and `/org/whatsapp` sections, plus the four fake project sub-tabs (§4.3), are the single biggest "looks real but isn't" risk in the product today.** The calling/WhatsApp sections in particular have zero on-screen disclaimer anywhere — a cold demo or a new hire has no way to tell the fabricated call logs and WhatsApp conversations from real ones. The project sub-tabs are the same problem at smaller scale (`ai-calling` fabricates specific call transcripts with no disclaimer; only `insights` warns the viewer).
- **Team-based visibility and `TeamUnit` exist only on an abandoned branch** (`vidya`, tip commit literally named `temp`), not on `main`. See §7.2. Anyone picking this up should decide explicitly whether to resurrect that branch's work or continue building on the current direct-assignment model — right now the Team module's "assign a project to a team" feature is UI/CRUD that doesn't do anything downstream.
- **`resolveBySlug` in `PublicSiteService` (`backend/src/modules/public-site/public-site.service.ts:207-265`) leaks draft/unpublished pages.** If no *published* landing page matches a slug, it falls back to returning **any** page with that slug regardless of status — including a draft. This means `GET /public/site/page/:slug` (and by extension the `/p/[slug]` public route, which calls it) can expose unpublished content to an unauthenticated visitor who knows or guesses the slug. Worth a deliberate decision on whether that's acceptable.
- **CI has no automated schema-drift check.** The `build-check` job runs `prisma generate` against a fake `DATABASE_URL` (`postgresql://build:build@localhost:5432/build` — not a reachable database), so it can't actually validate that migrations apply cleanly. `prisma migrate deploy` only ever runs for the first time, live, against production, during the SSH deploy step. Given the incident history in §8, a CI step that spins up a throwaway Postgres and runs `prisma migrate deploy` against it (or at minimum `prisma migrate diff` against a known-good baseline) would catch the next one of these before it reaches prod.
- **`ecosystem.config.cjs`'s `realestate-api` PM2 app looks stale** (points at `dist/main.js`, which doesn't exist — the real entrypoint is `dist/src/main.js`), since production actually runs the API via Docker, not PM2. Worth confirming with whoever wrote it whether it's meant to be a fallback, and fixing the path either way.
- **The BigEstate/iPixxel naming split** (top of this doc) suggests a rename that didn't fully propagate — worth finishing or intentionally leaving as-is, but currently it's just inconsistent (seeded super-admin login is `admin@bigestate.io`, per `RELEASE_NOTES.md`).
- **`LandingPage.submittedAt`/`reviewedAt`/`reviewedById`/`rejectionReason`** exist in the schema but aren't touched by the actual publish flow (§4.5) — they're schema groundwork for a review workflow. The corresponding UI, `frontend/app/org/publish-approvals/page.tsx`, is literally a `<ComingSoon title="Publish & Approvals" .../>` placeholder. So this is a planned-but-unbuilt feature, not a hidden live path — publishing today really is the direct, ungated `assertOrgCanPublish` check described in §4.5.

---

## 7. The two things you specifically asked about

### 7.1 Is a published landing page actually reachable by a real public visitor?

**Yes — this is real, wired end to end, not a stub.** Traced the full request path:

1. A visitor's browser requests, e.g., `acme.ipixxel.ae/` or an org's connected custom domain.
2. `frontend/proxy.ts` (this Next.js version's renamed `middleware.ts` — confirmed as a real, current convention, not dead code, per the Next docs shipped in `node_modules`) intercepts the request. Its matcher excludes API/static routes. It classifies the `Host` header: if it's not one of the platform's own bare hosts (`localhost`, the configured base domain, `NEXT_PUBLIC_APP_HOST`), it's treated as an org site host.
3. For an org-site host requesting `/`, `proxy.ts` rewrites the request to `/org-site` (`proxy.ts:76-78`).
4. `frontend/app/org-site/page.tsx` is a server component: it reads the real `Host` header and calls `resolveOrgSiteHost(host)` (`frontend/lib/openpage/resolve-host.ts`).
5. That function does a server-to-server fetch to the backend: `GET /public/site/resolve-org/:host` — no auth, `cache: "no-store"`.
6. `PublicSiteService.resolveByHost` (`backend/src/modules/public-site/public-site.service.ts:38-105`) looks up the `Organisation` by subdomain (requiring `subdomainStatus: 'active'`) or by custom domain (requiring `customDomainStatus: 'connected'`), then finds that org's **published** landing page — either the one explicitly pinned as the custom-domain target (`Organisation.customDomainLandingPageId`) or, failing that, the most recently updated published page — and returns its `content` (sections + config JSON).
7. Back on the frontend, `LocalSitePreview` (`components/openpage/live-site.tsx`) receives that content as a server-provided prop (`serverPage`) — this is the key detail: because the data came from the server, the component's `useEffect` client-side-only fallback path (which reads from browser `localStorage`, used for the *builder's own* local preview) never runs. It renders straight through `SiteRenderer` with `publicLive` set, no "LOCAL PREVIEW" chrome.

A second, independent public path exists for direct slug links (e.g., `ipixxel.ae/p/some-slug`): `app/p/[slug]/page.tsx` renders client-side and calls `findPageBySlug` (`frontend/lib/openpage/store.ts`), which checks the *builder's own browser* localStorage first (for their own live-editing convenience) and, if not found there, falls back to a real backend call — `GET /public/site/page/:slug` — which any anonymous visitor's browser can also reach directly. So this path is genuinely public too, not just a same-browser-only preview.

**The one real wrinkle**, covered in §6: `resolveBySlug` on the backend will serve a **draft** page over that same endpoint if no published page shares its slug. So the "reachable by the public" answer for `/p/[slug]` specifically comes with "sometimes even when it isn't published yet," which is probably not intended.

External dependency the code assumes but doesn't manage: actual DNS pointing the subdomain/custom domain at wherever this app is hosted. The codebase has real tooling to verify that assumption holds (`AdminOrgDomainService.verify()`, §4.9), but doesn't automate the DNS record creation itself as far as I found — that's an infra step outside this repo.

### 7.2 Is `TeamUnit` (standalone units assigned to teams) built?

**No — not on this branch.** Grepped the entire backend and frontend for `TeamUnit`: zero matches on `main`/`vidya_new`. There is no such model in `schema.prisma`, no such DTO, no such endpoint.

It does exist, but only on a separate branch, `vidya`, whose tip commit is literally named `temp` and which `git merge-base --is-ancestor` confirms was **never merged** into `main` or `vidya_new`. The relevant commit there is `b7537bb` ("feat(teams): move project/manager/lead assignment onto Teams and fix(teams): route project/lead visibility through team membership"), whose message describes exactly this: adding `TeamUnit` "mirroring TeamProject," plus a `team-scope.util.ts` helper meant to *replace* the direct `Project.managerId`/`ProjectSalesAgent` scoping everywhere (project list, all-units list, project detail, org dashboard, leads). None of that landed on the branch this handoff describes.

What actually exists on `main`/`vidya_new` today, confirmed by direct code inspection:
- `TeamProject` (team ↔ project) and `TeamMember` (team ↔ user) join tables exist and have working CRUD (`org-teams` module) — but as noted in §4.4, nothing reads them for authorization.
- Standalone units get visibility through their **own** direct fields instead: `Unit.managerId` and the `UnitSalesAgent` join table (`schema.prisma:1605-1646`), exactly mirroring how a project-bound unit's access is inherited from `Project.managerId`/`ProjectSalesAgent`. There's no team-mediated path for a standalone unit at all right now.

If you need standalone-units-via-teams, it either needs to be rebuilt from scratch or cherry-picked/rebased forward from the `vidya` branch's `b7537bb` — but given that branch's tip is called "temp" and it's several commits behind current `main` in other respects, treat it as a reference/starting point to evaluate, not something to merge wholesale.

---

## 8. Schema-drift history and the rules that prevent it

Four incidents, reconstructed from git history (`backend/prisma/migrations/`, commit diffs) — all in a roughly three-week span, one of which (the last) is explicitly documented in its own migration file as having broken production:

1. **`fea0256` "fix : for migration" (2026-08-26).** Two migration files had their SQL bodies literally swapped: `20260824145251_add_org_templates/migration.sql` contained the DDL for creating the `templates` table (which `20260824152956_add_template` was named for), and vice versa. Since `organisation_templates` has a foreign key into `templates`, this ordering/naming mismatch would break a clean `prisma migrate deploy` run. Fixed by swapping the file contents back to match their names.

2. **`b72f1fb` "fix: missing db migrations" (2026-09-01).** `schema.prisma` had been changed (added `LandingPage.subdomain`/`subdomainStatus`, changed a `Lead.source` default) without ever committing the corresponding migration file — classic model/migration-history drift. Fixed by manually authoring and committing the missing migration (`20260901120000_add_landing_page_subdomain`) after the fact.

3. **`2b227c5` "db" (2026-09-01, same day).** Added `backend/prisma/import-missing-schema.sql` — a hand-written, explicitly idempotent SQL script (every statement wrapped in `IF NOT EXISTS`/`DO $$ ... EXCEPTION WHEN duplicate_object`), meant to be run manually with `psql -f` against a database that had drifted out from under the normal migration history, bringing it in line with `schema.prisma`'s `OnboardingStep`/`OrgIndustry` enums and several `organisations`/`users` columns. Its own header comment includes a verification command (`prisma migrate diff ... --to-schema-datamodel` should output nothing when done) — i.e., this was a manual, out-of-band patch for a database that the normal migration chain couldn't reconcile on its own.

4. **`4e0b404` "fix: make drift-reconcile migration conditional on actual state" (2026-09-11) — the one that took production down.** The migration `20260910170000_reconcile_schema_drift` (added the day before, `25127d1`) was originally generated via `prisma migrate diff --from-url <live db> --to-schema-datamodel schema.prisma`, but the "live db" it diffed against was a **local machine that had already drifted from every other environment** (missing `org_types_pkey`, missing an `organisations.profile` column that had actually already been dropped elsewhere). The generated SQL baked in unconditional `DROP COLUMN`/`ADD CONSTRAINT` statements that assumed that one drifted machine's shape. Per the fix commit's own updated comment in the migration file: *"That made every statement below assume the local machine's state instead of checking the real one, so it failed on production, which still had the primary key and the column."* The fix rewrote every statement to be conditional (`DROP COLUMN IF EXISTS`, a `DO $$ ... IF NOT EXISTS ... END $$` block for the constraint) so the same migration applies cleanly regardless of which of the three possible starting states (already migrated, still on the old shape, or fresh) a given database is actually in.

**Rules currently in place, and their limits — be honest about both:**
- The lesson embedded in incident #4's own comment, and worth restating as a rule: **never generate a migration by diffing against a database whose state you haven't confirmed matches production.** A migration generated from a locally-drifted dev database will encode that drift as fact.
- Incident #3's `import-missing-schema.sql` demonstrates the fallback pattern for reconciling a database that's already out of sync: idempotent, guarded DDL (`IF NOT EXISTS`, `IF EXISTS`, `EXCEPTION WHEN duplicate_object/duplicate_column THEN NULL`) that's safe to run more than once — the same pattern incident #4's fix retrofitted onto the drift-reconcile migration.
- **What is *not* in place**: there's no CI safeguard that actually catches this class of problem before it reaches production. The `build-check` job's `prisma generate` runs against a fake, unreachable `DATABASE_URL`, so it can't validate that migrations apply. The real `prisma migrate deploy` only ever executes for the first time live against the production database, during the SSH deploy step. This is the same category of problem as incident #2 (a migration silently missing) and #4 (a migration that's wrong for the real target) — CI currently cannot catch either case before deploy. This is flagged again in §6 as an open gap, since it's the most actionable follow-up from this history.
