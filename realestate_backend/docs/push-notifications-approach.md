# Push Notifications — Recommended Approach

Covers the 9 required push events, whether BullMQ is needed, whether cron is needed, and a day-by-day implementation timeline. Written against the current codebase state (checked 2026-07-01):

- Backend: `career-compass-core-service` (NestJS + Prisma/TypeORM). Already has `EventEmitterModule.forRoot()` and `ScheduleModule.forRoot()` registered in `app.module.ts`, and already uses `@Cron` in two places (`analytics-partition.service.ts`, `advertisements.controller.ts`).
- `notifications` module already exists (`src/notifications`) and persists in-app notifications to the DB via `NotificationsService.createNotification()`, which already emits a `notification.created` event via `EventEmitter2`. **We reuse this module as the single entry point — we do not build a parallel notification system.**
- No Redis, no BullMQ, no Firebase Admin SDK are installed anywhere in the repo today. This is a from-scratch infra decision, not a "swap one thing for another."
- Mobile app: `career-compass-web` uses Capacitor (Android + iOS projects present) but `@capacitor/push-notifications` is **not yet installed**.
- Several of the required domain events already exist as `EventEmitter2` emits (`application.submitted`, `event.registered`, `event.published`, `event.cancelled`, etc.), and job-application already calls `notificationsService.createNotification()`. `event.updated` does **not** currently exist and account approve/suspend/reactivate/(de)activate flows currently only send emails (`admin.service.ts`), no events emitted.

## Do we need BullMQ?

**No — not for v1.** Recommend shipping without it, for these reasons:

- BullMQ requires Redis. There is none in this stack today. Adding it means provisioning, securing, and monitoring a new piece of infra plus a worker process/deployment, purely to support a notifications feature that is low-volume (single employer per job application, single employer per event registration, one admin action at a time).
- `EventEmitter2` is already installed and already wired through the exact places we need (notification creation, event registration, application submission). Listening to `notification.created` asynchronously gives us non-blocking, decoupled sending without new infra — effectively a "poor man's queue" that's good enough at this scale.
- The one seemingly "job-queue-shaped" requirement — event fan-out to all registered users on update — is a bounded loop (registrants of one event, not the whole user base). No need for a distributed queue to iterate a few hundred rows.
- **When BullMQ earns its keep (Phase 2, not now):** if the backend scales to multiple horizontal replicas (see cron caveat below), if FCM send volume grows enough that retry/backoff/dead-letter guarantees matter, or if you want a send history/dashboard (Bull Board) for support/debugging. None of that is true yet — add it later against real numbers, not speculatively.

Your lead's BullMQ+FCM instinct isn't wrong for the long run — it's just premature for a v1 that needs to ship fast. Flagging it explicitly here so it's a documented, deliberate deferral rather than something dropped silently.

## Do we need cron?

**Yes, but only for one requirement**: the event-expiry reminders ("2 days before" / "15 minutes before start"). Everything else in your list is triggered by a user/admin action, so it's event-driven, not time-driven.

- Use `@nestjs/schedule` (already a dependency, already used twice in this codebase) with a `@Cron('*/5 * * * *')` job that:
  - Selects ACTIVE events whose `startDate` falls in the next ~2 days and haven't had the 2-day reminder sent yet.
  - Selects ACTIVE events whose `startDate` falls in the next ~15 minutes and haven't had the 15-min reminder sent yet.
  - For each match, loops registrants and calls `notificationsService.createNotification()`, then stamps a "sent" marker so it never double-fires.
- **Caveat worth flagging to your lead:** `@Cron` runs on every instance of the service. If this app ever runs with >1 replica in production, this job (and the two pre-existing `@Cron` jobs) will fire duplicates. Fine for a single-instance deployment today; if/when you scale horizontally, either add a simple DB-based lock (`UPDATE ... WHERE locked_at IS NULL SKIP LOCKED`-style claim) or migrate just this job to a BullMQ repeatable job with a single worker. That's the concrete trigger condition for introducing BullMQ, not "let's add it now."

## Architecture

```
Domain action (job applied, event registered, admin approves org, ...)
        │
        ▼
notificationsService.createNotification()   ← existing method, unchanged
        │  (persists Notification row)
        │  emits 'notification.created'      ← existing emit, unchanged
        ▼
PushNotificationsListener (@OnEvent('notification.created'))   ← NEW
        │  loads device tokens for notification.userId
        ▼
FCM Admin SDK  →  sendEachForMulticast()
        │
        ▼
Capacitor app (@capacitor/push-notifications)  ← NEW, mobile side
```

Only two genuinely new pieces of backend logic:

1. **`PushNotificationsListener`** — one `@OnEvent('notification.created')` handler that fetches device tokens for the notification's `userId` and calls FCM. This is the single fan-in point: every existing and new call to `createNotification()` automatically gets push, for free, with zero changes needed at most call sites.
2. **Fan-out for event-update and reminders** — a small loop that resolves "registrants of event X" → calls `createNotification()` per user. Everything downstream is identical to (1).

### Backend changes needed

| Item | Change |
|---|---|
| `firebase-admin` | Add dependency, init once from a service-account JSON (env/secret), guard behind config so local dev without creds doesn't crash. |
| `DeviceToken` | New small table: `userId, token, platform, lastSeenAt`. New tiny controller: `POST /notifications/device-token` (register/upsert), `DELETE /notifications/device-token` (on logout). |
| `PushNotificationsListener` | New. `@OnEvent('notification.created')` → send via FCM. Remove/deactivate stale tokens on `messaging/registration-token-not-registered`. |
| `events.service.ts` `updateEvent()` | Currently emits nothing on update — add `this.eventEmitter.emit('event.updated', updated)`. |
| New `event.updated` listener | Fan out: look up registrations for the event, call `createNotification()` per registrant. |
| `admin.service.ts` | approve/suspend/reactivate org, user/employer (de)activate — currently only send email. Add a direct `createNotification()` call at each of these ~5-6 call sites (single recipient each, no fan-out needed, no new event emit required). |
| Event reminder cron | New `@Cron` job as described above; needs 2 nullable timestamp columns (or a side table) on Event to track "2-day sent" / "15-min sent". |

Nothing about the existing `NotificationsService`, `NotificationsController`, or DB schema for `Notification` needs to change — push is purely an additive side effect wired through the event it already emits.

### Mobile (career-compass-web) changes needed

- `npm install @capacitor/push-notifications`, `npx cap sync`.
- Firebase project: register Android + iOS apps, drop in `google-services.json` (Android) and enable Push Notifications capability + upload APNs auth key (iOS).
- On login/app start: request permission → get FCM token → `POST /notifications/device-token`. On token refresh, re-post. On logout, `DELETE`.
- Handle `pushNotificationReceived` (foreground) and `pushNotificationActionPerformed` (tap → deep link into the relevant job/event/notification screen).
- **iOS note:** push doesn't work on the simulator — needs a physical device or TestFlight build, and APNs key setup is usually the slowest part of week 1.

## Timeline

Assuming one full-stack engineer comfortable with both NestJS and Capacitor:

| Day | Work |
|---|---|
| 1 | Firebase project setup (Android + iOS apps, service-account key, APNs key). Install `firebase-admin` (backend) + `@capacitor/push-notifications` (mobile). Device-token table + register/remove endpoints. |
| 2 | Mobile-side token registration, permission flow, foreground/tap handlers. Backend `PushNotificationsListener` wired to existing `notification.created` event; basic send + invalid-token cleanup working end-to-end for one flow (job application → employer). |
| 3 | Wire remaining direct (non-fan-out) cases: event registration → employer, org approved/suspended/reactivated, user/employer (de)activate — mostly just adding `createNotification()` calls at existing admin/service call sites. Add missing `event.updated` emit + its fan-out listener. |
| 4 | Event reminder cron (2-day / 15-min), dedupe columns, timezone edge cases. Start real-device testing (Android + iOS). |
| 5 | iOS/Apple push troubleshooting buffer (provisioning/APNs friction is the most common slip here), deep-link tap navigation, error/logging polish, sign-off. |

**Estimate: 5 working days** for a lean, production-ready v1 covering all 9 requirements, using the existing notification module + `EventEmitter2` + `@nestjs/schedule` only (no new infra). Add **1–2 days buffer** if this is the team's first time setting up APNs — that step reliably eats time regardless of engineer experience.

If BullMQ + Redis were built in from day one instead (provisioning, worker process, deploy/monitoring changes, Bull Board), add **2–3 extra days** for infra that isn't needed at current volume — that's the concrete cost of doing it now vs. deferring it to Phase 2.

## Summary recommendation

- **Fast path (recommended):** existing `notifications` module + `EventEmitter2` (already installed) for all 8 action-triggered notifications, `@nestjs/schedule` `@Cron` (already installed, already used elsewhere in this codebase) for the one time-based reminder requirement, `firebase-admin` for delivery. No new infra. ~5 days.
- **Defer BullMQ** until there's a real trigger: horizontal scaling (duplicate cron problem) or growth in send volume/retry needs. Documented above so it's a deliberate, revisit-able decision, not a rejection of your lead's suggestion.
