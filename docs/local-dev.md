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
