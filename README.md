# Zyvara

Responsive environmental challenge application for **zyvara.us**. Next.js App Router, React, TypeScript, Drizzle/PostgreSQL, Firebase Auth/Storage adapters, and a server-side deterministic mock assessment provider. The original `design-system/` files are preserved and imported as the theme foundation.

## Local development

Requires Node.js 22 or newer and pnpm. Install dependencies, configure the restricted local demo, and start the app:

```sh
pnpm install
pnpm exec tsx scripts/setup-demo.ts
pnpm db:seed
pnpm dev
```

Open `http://127.0.0.1:3000`. Sign in with a demonstration profile name and local access code `local-zyvara-demo`. Use the same name to restore that profile. Demo profiles are test-only; the shared code is not a production identity system. The generated session secret remains in ignored `.env.local`. Setup never overwrites an existing environment file. The development server stores PostgreSQL records in `.data/postgres`, photos in `.data/media`, and the development session key in `.data` if no explicit secret is configured. Records survive refreshes and server restarts. Run only one development server against one data directory.

Without a service configuration or demo setup, browsing works with local seeded challenges; protected writes remain locked. The four editorial seed challenges are starter content, not fabricated participation statistics.

## Production configuration and deployment

Use a fresh Tiger Data PostgreSQL database, fresh Firebase project with Google sign-in enabled, and a fresh private Firebase Storage bucket. Variable names are in `.env.example`; no credentials are included. Add values locally or to Vercel's environment settings.

- Database: `DATABASE_URL`, optional `DATABASE_SSL_CA` and `DATABASE_POOL_MAX`. [Tiger handoff](docs/TIGER-DATA-HANDOFF.md).
- Firebase server: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`. Firebase credentials never enter client bundles. Service account needs auth verification and bucket access/signing privileges.
- Firebase browser: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`. These identify the Firebase web app, not administrative credentials. Add the deployed host to Firebase authorized domains.
- Set `AUTH_MODE=firebase`, `STORAGE_MODE=firebase`, `ASSESSMENT_PROVIDER=mock`, `MOCK_SCENARIO=needs_more_evidence`, and `APP_ORIGIN=https://zyvara.us` (or the exact preview origin). Keep `DEMO_MODE` unset/false. `ADMIN_FIREBASE_UIDS` is an optional comma-separated server-only admin allowlist.

Run migrations and seed against the fresh database, verify it, then deploy to Vercel with framework Next.js and Node 22. Install `pnpm install --frozen-lockfile`, build `pnpm build`. Configure the custom domain after a preview passes. The application has a 60-second function budget and 25-second assessment timeout. Production requires `DATABASE_URL`; local PGlite is not a deployment fallback. Firebase direct uploads avoid Vercel's request body limits.

Apply `storage.rules` to deny client SDK access. Set bucket CORS using `storage.cors.json`, replacing/adding the exact preview origin. Originals are uploaded using 10-minute server-issued signed PUT URLs with generation preconditions; all retrieval uses `/api/media/:uploadId` after owner/publication checks. No permanent private download URLs are exposed. Cloud IAM must keep the bucket private. Finalization checks actual stored bytes, file signature/format, size and decoding; sanitized WebP derivatives remove metadata. Two photos may each be up to 10 MB. Pixel limit: 40 million. No animated images.

`pnpm db:verify` and `/api/health` prove database access, not Firebase setup. Before launch, prove Google login on the deployment, direct upload/finalization, authorized media retrieval, cross-user isolation, and withdrawal. External credentials are required to verify these live integrations; merely having adapter code does not establish connectivity.

## Implemented flows

Discover/search/category filtering → individual challenge detail → sign-in → private photo upload → immutable evidence finalization → persisted mock assessment → duplicate-safe 50-point award → progress/history → optional consented community publication and withdrawal. Manual creation, creator closure, owner contribution deletion, report submission, and admin hiding endpoints are included. Points are derived from stored rewards; no carbon savings or confidence percentages are invented.

Photos and descriptions remain selected after upload errors. Successful upload IDs are reused if finalization fails. Provider failures retry stored evidence. Revisions snapshot requirements and retain previous versions; stale results cannot award or overwrite the current revision. Sharing starts off. Only supported, consented, non-hidden latest evidence is public. Public images have `private, no-store` cache headers so withdrawal takes effect on subsequent requests.

Every mock result is explicitly simulated; it is not image analysis. Development fixtures include supported, needs-more-evidence, not-supported, permanent failure, and failure-once recovery. Ordinary production clients cannot select scenarios or authorize rewards. [AI handoff and exact adapter contract](docs/AI-HANDOFF.md).

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

`tests/integrity.test.ts` exercises database transactions, uploads/metadata, private evidence, sharing, provider outcomes/retry, revisions/stale results, deadline/closure, deletion/moderation, concurrency, and ledger reconciliation using a disposable server-side PostgreSQL database. E2E uses a separate demo data directory and controlled fixtures. See [verification notes](docs/VERIFICATION.md) for observed results.

## Operational limits

Assessment processing is awaited in a request. Pending/expired processing jobs are resumable when the owner returns; there is no unattended queue yet. Five attempts per evidence version and persisted request throttles bound retries. Configure a worker/queue before promising unattended completion. Rate limits behind a proxy assume trusted forwarding headers; production hosting must strip spoofed forwarding headers.

Deletion stops app access first and removes the photo objects; failures of object cleanup require an organizer retry. Abandoned upload slots, failed derivative writes, report review, account-level deletion, backup/restore, retention duration and organizer contact are operational follow-ups before a public pilot. No likes, comments, or email-link sign-in are shipped. A hidden contribution keeps its recognition ledger; reward reversals require an auditable future operation.

GitHub Actions checks the source and build. Keep preview and production databases/buckets separate, use least-privilege credentials, and apply migrations before deployment. Roll back application code through Vercel's previous deployment; migration rollback requires an explicit database plan. No older Grenes code, data, configuration, or credentials were copied.

Official references used: [Next route handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [Firebase server session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies), [Drizzle PGlite adapter](https://orm.drizzle.team/docs/connect-pglite), [PGlite persistent filesystems](https://pglite.dev/docs/filesystems).
