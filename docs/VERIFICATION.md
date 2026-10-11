# Verification — October 11, 2026

Verified in this Windows workspace with Node.js 22, Next.js 16.4.0, Chrome, the persistent local PostgreSQL adapter, private local storage, and restricted signed demo sessions. No external service is represented as connected on the basis of configuration alone.

| Check | Observed result |
|---|---|
| TypeScript strict type check | Passed, no errors |
| ESLint source/scripts/tests | Passed, no errors or warnings |
| Production build | Passed with webpack; dynamic app and API routes emitted |
| Backend integrity suite | 12 tests passed |
| Browser journey | Passed: sign-in, manual creation, actual new record, private upload, failed assessment, retry, 50-point award, refresh, sign-out/sign-in, sharing, withdrawal, owner deletion |
| Protected API writes | Anonymous request rejected with 401; foreign-origin session write rejected with 403 |
| Private-media authorization | Anonymous and different-member reads denied; public read permitted only after supported consent; withdrawal immediately denied subsequent read |
| Image validation | Invalid decoding, MIME mismatch, oversized bytes rejected; derivative is WebP without EXIF |
| Mock outcomes | Supported, insufficient, unsupported, permanent failure, failure-once recovery exercised |
| Reward integrity | Eight concurrent assessment requests and ten concurrent direct reward inserts produced one award; totals match the ledger |
| Evidence revisions | One contribution reused; requirement snapshots retained; late old assessment could not overwrite or award newer evidence |
| Production fixture controls | Ordinary production clients rejected when attempting to select a scenario |
| Server restart persistence | Reward records survived database close and a separate Node server process reading the same persisted database |
| Closure and repeat uploads | Closed challenge rejected evidence; concurrent finalization of the same photo accepted once |
| Moderation/deletion | Non-admin hiding rejected; hidden/deleted media inaccessible; same challenge cannot earn another award after deletion |
| Dialog accessibility | Escape closes the share dialog and returns keyboard focus to its trigger |
| Responsive Discover | Rendered at 1440, 768, and 390 pixels; no horizontal overflow; mobile bottom navigation visible |
| Browser runtime | No page errors during the completed journey |

Browser artifacts are generated under ignored `test-results/screenshots/`: `discover-1440.png`, `discover-768.png`, `discover-390.png`, `desktop-progress.png`. E2E runs on port 3100 with `.data/e2e` and `.next-e2e`, separate from the visible local preview on port 3000. Test profiles and generated challenge records are explicitly demonstration data, not production participants.

Commands used: TypeScript CLI, ESLint CLI, `tsx --test tests/integrity.test.ts`, `next build --webpack`, and Playwright. The Windows sandbox disallowed Turbopack junction creation and some build-directory operations; the completed production check used webpack outside that filesystem restriction. Source does not require a change of framework.

Live Tiger Data verified: free `zyvara` service in AWS us-east-1, initial migration applied, four editorial challenges seeded, actual PostgreSQL query and all eight core tables verified. TLS uses the service CA with certificate and hostname verification enabled. Credentials and certificate settings are only in ignored `.env.local`.

Live Vercel deployment and custom domain verified: `https://zyvara.us` serves the application and four Tiger-backed challenges. `/api/health` and `/api/challenges` returned HTTP 200. Health deliberately reports `productionReady: false` until Firebase server configuration is complete. GitHub Actions passed on commit `5e87776`.

Vercel deployment `dpl_EwecAuUX5dHUuc4eaydw4NNCveKn` uses project Build Command override `pnpm exec next build` (Turbopack). The webpack build passed locally and in CI but its hosted API failed before application startup in Vercel's bytecode loader; rebuilding with Turbopack restored the API. Local Windows and CI scripts retain their verified webpack commands.

Firebase project `zyvara-3753d` and its web app are created, Google provider enabled, and deployment hostnames authorized. Photo storage uses Tiger PostgreSQL at the user's request to avoid Firebase billing. Firebase Storage IAM/CORS are no longer deployment prerequisites. Admin credentials remain pending: the generated key appeared in a browser inspection output; the Vercel form was discarded without saving. Replacement and revocation are explicitly authorized, but browser control failed before completion. Do not deploy the exposed key.

The full browser journey passed with PostgreSQL media storage, including a photo larger than 3 MiB compressed before upload and a saved sanitized WebP smaller than 1 MiB. Both desktop contribution flow and responsive Discover tests passed. Production Gemini mode is selected in Vercel, with user-provided key/model present; a redeployment and live call remain pending replacement Firebase credentials.

PostgreSQL photo mode: all 21 provider/backend tests passed, including private-media isolation/publication/withdrawal/deletion, concurrent finalization, metadata removal, discarded staging photos, size bounds and one-time rewards. Actual Tiger write/read/duplicate-object checks passed with a generated image removed after the test. Both migrations were applied to Tiger. TypeScript, lint and webpack production build passed. Full deployed upload and Google sign-in remain pending Firebase Auth server credentials; live Gemini remains unverified until activated and a signed-in assessment is submitted.

Operational follow-ups before a public pilot: unattended assessment queue, abandoned-upload cleanup, report review UI/contact/retention policy, account-level deletion, backup/restore procedures, and auditable reward reversals. Likes/comments and email-link sign-in are intentionally deferred.

Gemini integration added from the teammate repository at `43e5e2485d840f7c7c8a85883e670d2ab99a00d2`. All 20 backend/provider tests passed: supported/insufficient/unsupported mapping; immutable ordered requirements; before/after byte labeling; malformed/inconsistent results rejected; cancellation; safe errors; failed-job recovery through the actual application service; concurrent calls, persisted live verdict and exactly one award. Strict TypeScript, ESLint, and webpack production build passed. These tests use an injected fake Gemini transport and do not establish live API connectivity or visual accuracy. Live activation remains pending the steps in `SETUP-NEXT-STEPS.md`.

Update: replacement Firebase key verified against Zyvara Auth and saved as Production Secrets (FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL) in Vercel. Commit 618f51d deployed; public config and health report productionReady true, simulatedAssessment false, PostgreSQL private photos. GitHub validation passed. Google account selection and the first deployed Gemini assessment remain pending; revocation of the old exposed key is not yet confirmed.

Live Google sign-in verified: authenticated Henry profile and progress page loaded through the production server session. First live Gemini test awaits browser extension file-upload access. Old Firebase key revocation still requires cloud verification; deleting a local JSON file is insufficient.
Live verification completed: Google sign-in, private synthetic PNG, sanitized Tiger photo, deployed Gemini 3.8 Flash, persisted per-requirement not-supported feedback, refresh, and journal with zero points/zero awards. Contribution b0b91fe6-3613-4b9b-a09d-db5adfbe7799 remains private and labeled PRIVATE CONNECTIVITY TEST. User confirmed old key revoked in Google Cloud. No live positive-reward claim is made from this test.
