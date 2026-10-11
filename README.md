# Zyvara

Responsive environmental challenge application for **zyvara.us**. Next.js App Router, React, TypeScript, Drizzle/PostgreSQL, Firebase Auth/Storage adapters, and server-side Gemini or deterministic mock assessments. The original `design-system/` files are preserved and imported as the theme foundation.

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

Use Tiger Data PostgreSQL for records and private photos, and a Firebase Spark project for free Google sign-in. No Firebase Storage bucket or Blaze billing upgrade is required. Variable names are in `.env.example`; no credentials are included.

- Database: `DATABASE_URL`, optional `DATABASE_SSL_CA` and `DATABASE_POOL_MAX`. [Tiger handoff](docs/TIGER-DATA-HANDOFF.md).
- Firebase server: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`. These support verified and revocation-checked sign-in sessions and never enter browser bundles.
- Firebase browser: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`. These identify the Firebase web app, not administrative credentials. Add the deployed host to Firebase authorized domains.
- Set `AUTH_MODE=firebase`, `STORAGE_MODE=postgres`, and `ASSESSMENT_PROVIDER=mock` or `gemini` (with server-only key/model). Keep `DEMO_MODE` unset/false. `ADMIN_FIREBASE_UIDS` is an optional server-only admin allowlist.

Apply all migrations with `pnpm db:migrate`. The hosted Vercel project uses Build Command override `pnpm exec next build` (Turbopack); local Windows and CI retain webpack. The application has a 60-second function budget and 25-second assessment timeout. Production requires `DATABASE_URL`; local PGlite is not a deployment fallback.

With `STORAGE_MODE=postgres`, uploads pass through the authenticated app server. The browser shrinks files over 3 MiB to fit the hosting request limit. Server decoding validates type and pixels, strips metadata, and stores sanitized WebP copies only (1280-pixel longest edge, quality 75, maximum 1 MiB each). Finalization atomically replaces the staging copy with the final copy. `media_objects` holds encoded bytes, capped at 100 MiB of decoded media (approximately 133 MiB encoded plus database overhead). An advisory lock serializes quota accounting; new writes fail when full. No automatic paid upgrade occurs. Abandoned uploads still need organizer cleanup. This is small-prototype storage.

All retrieval uses `/api/media/:uploadId` after ownership, challenge-creator review, or publication checks, with no permanent private download URLs. The optional Firebase Storage adapter and rules remain available but inactive in PostgreSQL photo mode.

`pnpm db:verify` and `/api/health` prove database access, not Firebase setup. Before launch, prove Google login on the deployment, direct upload/finalization, authorized media retrieval, cross-user isolation, and withdrawal. External credentials are required to verify these live integrations; merely having adapter code does not establish connectivity.

## Implemented flows

Discover/search/category filtering → individual challenge detail → sign-in → private photo upload → immutable evidence finalization → persisted assessment → duplicate-safe 50-point award → progress/history → optional consented community publication and withdrawal. Manual creation, creator closure, owner contribution deletion, report submission, and admin hiding endpoints are included. Points are derived from stored rewards; no carbon savings or confidence percentages are invented.

Photos and descriptions remain selected after upload errors. Successful upload IDs are reused if finalization fails. Provider failures retry stored evidence. Revisions snapshot requirements and retain previous versions; stale results cannot award or overwrite the current revision. Sharing starts off. Only supported, consented, non-hidden latest evidence is public. Public images have `private, no-store` cache headers so withdrawal takes effect on subsequent requests.

Every mock result is explicitly simulated; it is not image analysis. Development fixtures include supported, needs-more-evidence, not-supported, permanent failure, and failure-once recovery. Ordinary production clients cannot select scenarios or authorize rewards. [AI handoff and exact adapter contract](docs/AI-HANDOFF.md).

The teammate Gemini module is integrated server-side. Activate with `ASSESSMENT_PROVIDER=gemini`, `GEMINI_API_KEY`, and `GEMINI_MODEL`; no separate AI service is required. [Exact remaining setup steps](docs/SETUP-NEXT-STEPS.md).

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

Deletion stops app access first and removes the photo objects; failures of object cleanup require an organizer retry. Abandoned upload slots, failed derivative writes, report review, account-level deletion, backup/restore, retention duration and organizer contact are operational follow-ups before a public pilot. No likes, comments, or email-link sign-in are shipped. A hidden contribution keeps its recognition ledger; creator denial records a review reason and reverses its award.

GitHub Actions checks the source and build. Keep preview and production databases/buckets separate, use least-privilege credentials, and apply migrations before deployment. Roll back application code through Vercel's previous deployment; migration rollback requires an explicit database plan. No older Grenes code, data, configuration, or credentials were copied.

Official references used: [Next route handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [Firebase server session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies), [Drizzle PGlite adapter](https://orm.drizzle.team/docs/connect-pglite), [PGlite persistent filesystems](https://pglite.dev/docs/filesystems).

Creators cannot submit to their own challenges. On their challenge page, they can review the latest evidence after Gemini, record a reason, and approve or deny once per evidence version. Approval grants at most 50 points; denial removes points and sharing. Original AI feedback is retained. Description fields show live counts against the existing 2,000-character limit. The footer offers persistent Small, Default, and Large text sizes.

