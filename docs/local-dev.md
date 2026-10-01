# Local development notes

## Prisma client goes stale in the API container after a schema change

**Symptom.** You change `backend/prisma/schema.prisma` and run a migration, but
the running `realestate-api` container keeps throwing TypeScript errors like
`Property 'xxx' does not exist on type '{ ... }'` for the new column/relation,
or serialized API responses are missing the new fields. `npx prisma generate`
on your host machine appears to succeed but changes nothing.

**Cause.** `backend/docker-compose.yml` mounts the project as `.:/app` **and**
shadows `node_modules` with an anonymous volume:

```yaml
    volumes:
      - .:/app
      - /app/node_modules   # <- anonymous volume, container-only
```

So the container has its **own** `node_modules` (including its own generated
`@prisma/client`), completely separate from the one on your host. Running
`prisma generate` on the host regenerates the host copy; the container never
sees it. The container's client is only regenerated when the image is (re)built
or when `prisma generate` runs *inside* the container.

**Fix.** After applying any migration, regenerate the client inside the
container:

```bash
docker exec realestate-api npx prisma generate
```

The `npm run start:dev` watcher then recompiles against the fresh client. If it
doesn't pick it up, `touch` a source file it watches or `docker restart
realestate-api`.

> Not fixing the mount here on purpose — a proper fix (e.g. a named volume plus
> a `prisma generate` step in the container entrypoint) is a separate change.
> This note is so the next person doesn't lose an hour to it.

## Applying migrations against the Dockerised Postgres

`realestate-pg` publishes Postgres on `localhost:5433`. If Prisma CLI commands
intermittently fail with `P1001 Can't reach database server at localhost:5433`,
force IPv4:

```bash
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/realestate?schema=public" \
  npx prisma migrate dev
```

## Demo / dummy marketing data

Re-run the database seed to populate the Skyline Developers demo org with
Connected Apps, campaigns, sync logs, metric snapshots, and attributed leads
(Facebook Lead Ads, Google Ads, website):

```bash
cd backend
npx prisma db seed
```

Login as `rohan@skylinedev.in` (password from `SEED_USER_PASSWORD`, default
`Welcome@123`). Demo connections are marked `metadata.demo=true` so Sync Now
does not call live Meta/Google APIs.

Primary product path: **Marketing → Connected Apps** (Facebook / Instagram /
WhatsApp). Settings → CRM and project Integrations still expose the legacy Meta
card. Manager-facing overview: `docs/social-media-connection.md`.

1. Create a Meta App with **Facebook Login** + **Webhooks** + **Lead Ads** products.
2. Copy `META_APP_ID`, `META_APP_SECRET`, and a random `META_WEBHOOK_VERIFY_TOKEN`
   into `backend/.env` (see `backend/env.example`).
3. Expose the API with a tunnel (ngrok, Cloudflare Tunnel, etc.) and set
   `BACKEND_PUBLIC_URL` to that public base (no trailing slash).
4. In Meta App settings:
   - Valid OAuth Redirect URI: `{BACKEND_PUBLIC_URL}/org/meta/oauth/callback`
   - Webhook callback URL: `{BACKEND_PUBLIC_URL}/webhooks/meta`
   - Verify token: same as `META_WEBHOOK_VERIFY_TOKEN`
   - Subscribe the app to the `leadgen` field on Page.
5. Super Admin → Marketing / Lead Attribution confirms Meta env is loaded and
   the org is allowed to use Meta platforms if access is restricted.
6. Org admin connects from **Marketing → Connected Apps** (or legacy
   Settings → CRM / project Integrations). Prefer Connected Apps.
7. Without a public tunnel, use **Connect with Page token** (Graph API Explorer
   long-lived Page token) instead of OAuth.
8. **Verify:** connect from Connected Apps, then click **Sync Now** (imports
   recent form leads) or send a Meta test lead → confirm rows in Lead Center
   with Source = Facebook, Medium = Paid Social, and Marketing Attribution on
   the lead detail page.
9. Honest limits for demos: Instagram/WhatsApp share Meta OAuth but leads are
   still attributed as Facebook/Meta today; Google Ads connect stores tokens
   only (no lead or spend sync yet).
