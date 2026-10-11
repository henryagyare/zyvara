# Zyvara MVP delivery plan

Prepared October 11, 2026, updated after deadline and team confirmation. Status: proposed implementation baseline, ready for team review.

**Deadline override:** submit by **1:00 PM CDT today, Sunday October 11**. At the 2:35 AM CDT planning check, approximately **10 hours 25 minutes** remained. Section 12 is the active schedule. Build the competition slice first; the complete MVP and pilot scope describe the next delivery gates.

## 1. Executive decision

Build a fresh, responsive web application at **zyvara.us**. Preserve the latest frontend visual system. Use Grenes only as a reference for product concepts; create a new repository, backend, database, authentication project, and storage bucket. Do not migrate legacy users or data for the MVP.

The product promise is: **Find a practical environmental challenge, document your action, receive useful AI feedback, and build a visible record of participation.**

The first audience is students and campus environmental clubs. Individuals and other community groups can use the same workflow, but the first release should prove one campus-sized use case rather than support every kind of organization.

The MVP must complete this loop with real services:

**Discover → Challenge details → Sign in → Submit evidence → Gemini assessment → Points and personal progress → Optional community publication.**

Challenge creation is manual. AI assesses submissions; it does not create or categorize challenges. Measure documented participation, not inferred carbon savings or independently verified environmental impact.

## 2. Sources and decision hierarchy

1. The user's current request and explicit decisions in **frontend** control scope and design.
2. [Latest design handoff](design-system/DESIGN-SYSTEM.md), [interactive preview source](design-system/index.html), and [Paper designs](https://app.paper.design/file/01M4MV3FTCQ38BK631JD95P74W) define the visual direction and interactions.
3. **Branch · Hackathon project ideas** establishes the fresh web rebuild, Gemini integration, and preference for Tiger Data.
4. [Grenes repository](https://github.com/henryagyare/grenes) provides historical implementation context.

The chat reader exposed the branch's user messages but returned references instead of the assistant replies. The frontend chat includes the user's full product brief, so the product definition is grounded in that brief. Earlier stack recommendations have not been assumed to be approved.

The newer frontend chat explicitly confirms **Zyvara / zyvara.us**. This takes precedence over the earlier `zyvra.us` spelling. Six editable Paper artboards exist; assessment, community, progress, sign-in, recovery, and responsive variants are supplied locally. Completing their native Paper versions is not a release dependency.

Current workspace contains a design prototype, not an implemented application. Authentication, upload, publishing, Gemini, points, and social actions are currently demonstrations. All prototype counts, profiles, results, and dates must be replaced with actual data or clearly labeled demo fixtures.

## 3. Assumptions and release boundaries

Confirmed: three contributors. Henry owns frontend and backend; teammate 2 owns AI; teammate 3 owns Tiger Data integration. Submission deadline is Sunday October 11, 2026, 1:00 PM CDT, confirmed by the user and [Devpost](https://codered-orion-ccs.devpost.com/). Roughly 10 hours 25 minutes remained at the 2:35 AM CDT planning check. Do not plan a 48-hour build. Arrange short breaks and explicit handoffs within the remaining window.

Two release gates prevent a polished mockup from being mistaken for a finished MVP:

| Gate | Required result |
|---|---|
| Competition slice by 1 PM | Hosted discovery/detail → real stored evidence → real Gemini feedback → duplicate-safe points/history. Google auth is the default; a restricted demo session is an explicitly labeled fallback. Creation and community ship only if the core works before the 8 AM checkpoint |
| Complete MVP after competition | Real member identity, manual creation/discovery, persistent evidence, real Gemini outcomes, duplicate-safe recognition, personal history, consented community publication |
| Small pilot | MVP plus report/hide administration, deletion and privacy controls, complete recovery paths, operating instructions, and pilot feedback measurement |

For today's submission, M01–M04 and M06–M09 define the critical slice. M05 and M10 are next priorities and move after the competition if the core is not stable by 8 AM. M11–M15 are deferred. Keep access boundaries even in a restricted demonstration: disabling authentication globally is not an acceptable fallback. Describe the narrower deliverable and unfinished capabilities accurately.

## 4. Scope and acceptance criteria

| ID | Capability | Priority | Acceptance criteria |
|---|---|---|---|
| M01 | App shell and responsive theme | Required | Apply the existing tokens and visual hierarchy; desktop and mobile navigation work; each page has one heading; no horizontal overflow at 390px |
| M02 | Authentication | Required | Google sign-in, sign-out, session restoration, and protected writes work on the deployed domain; unauthenticated users can browse and return to their chosen challenge after sign-in |
| M03 | Discover | Required | Read published challenges from the database; category and title search combine correctly; empty/error states offer recovery; each card links to its own challenge |
| M04 | Challenge detail | Required | Show title, description, creator, category, optional deadline, evidence requirements, and recognition rule; distinguish active, expired, and unavailable challenges |
| M05 | Create challenge | Required | Signed-in member supplies title, description, category, evidence requirements, optional deadline; validation retains input; publish creates a durable record and opens the actual new detail page |
| M06 | Submit evidence | Required | One result photo and description required; before photo optional; JPEG/PNG/WebP only, maximum 10MB each; upload errors retain text and valid photos; server confirms attachment ownership and validity |
| M07 | Gemini assessment | Required | Evaluate actual stored evidence against snapshotted requirements; display supported / needs more evidence / not supported; explain visible observations and a useful next step; service failure is a separate state |
| M08 | Recognition | Required | Proposed 50 points per supported contribution, once; retries, refreshes, concurrent requests, and revised evidence cannot award the same contribution twice |
| M09 | Personal progress | Required | Show real point total, supported contributions, supported categories, and submission history; open each assessment; zero states work; values survive refresh and sign-out/sign-in |
| M10 | Community publication | Required | Sharing defaults off; only supported contributions with explicit consent appear; users can withdraw sharing; private photos cannot be retrieved through public feed endpoints |
| M11 | Likes | Secondary | One like per member per post, reversible, persistent, and safe under repeat requests; include only after the required loop passes |
| M12 | Comments | Secondary | Signed-in text comments, bounded length, rendered safely, author deletion and moderator hiding; ship for pilot only if moderation is ready |
| M13 | Basic moderation | Pilot gate | Members can report a challenge/post/comment; administrator can hide it; hidden media is inaccessible through normal app access; actions are logged |
| M14 | Account/content deletion | Pilot gate | Owner can remove their evidence and contribution; public access ends; images and provider copies follow a documented cleanup policy; account deletion has an explicit confirmation |
| M15 | Email sign-in link | Secondary | Implement the local design's alternative only after Google auth passes; hide the email option until functional |

Deferred: native Android/iOS apps, offline/PWA synchronization, leaderboards, badges, streaks, followers, direct messages, push notifications, organization accounts, maps/GPS verification, automated challenge creation, recommendation engines, financial rewards, carbon calculations, and elaborate analytics. No standalone social posts: community entries originate from supported contributions.

## 5. Product rules to implement

### Challenges

- Four manual categories: Cleanup, Planting, Recycling, Conservation. Seed several examples, with cleanup as the demonstration journey.
- Proposed limits: title 1–80 characters; description and evidence requirements 1–2,000 each; contribution description 1–2,000. Trim whitespace and validate on both client and server.
- Deadline is optional. Store UTC timestamps; show a clear local deadline. A date-only selection means end of that date in the creator's chosen timezone, displayed before publishing.
- A published challenge accepts evidence until its deadline. Accept eligibility at server finalization time; delayed AI processing after the deadline remains eligible.
- Freeze substantive requirements after the first submission. Closing a challenge is allowed; changing its mission should produce a new challenge. Every submission still snapshots the requirements used for assessment.
- Do not implement a separate joining system for MVP. The user's first submission establishes participation.

### Contributions, retries, and points

- One contribution per member per challenge for MVP. Evidence revisions belong to that contribution; they do not create another reward opportunity.
- One required result photo, one optional before photo. Before photos are helpful, not compulsory.
- The proposed fixed reward is **50 points**, matching the design assumption. This is a PM recommendation, not a previously approved business rule. The model never selects the number of points.
- Only supported assessments create rewards. Insufficient, unsupported, provider-blocked, malformed, and failed assessments award zero points.
- Once supported, the contribution cannot be resubmitted for additional points. Withdrawal of sharing does not remove recognition. Moderator invalidation uses an auditable reversal rather than overwriting history.
- Non-supported contributions can be revised. Provider failures retry the same evidence version; evidence changes create a new version. Bound automatic provider retries and user retry frequency.
- Persist status and images before assessment. Closing the browser or refreshing cannot lose finalized evidence or produce an automatic success.

### Sharing and access

- The upload checkbox means: publish this contribution if the assessment supports it. Explain that sharing includes display name, description, selected photos, challenge, and assessment status.
- Default consent off. After success, a separate share action can opt in. Store consent timestamp and allow withdrawal at any time.
- Keep originals private. Publish only sanitized derivatives through controlled access; strip location metadata. Avoid public permanent download links for private evidence.
- Personal progress is owner-only. Challenge discovery and consented community posts are public. Administrative access is explicitly authorized, logged, and described in privacy information.

## 6. Design implementation contract

Follow the field-journal system already created: warm canvas `#F7F8F2`, ink `#172E25`, forest `#245C42`, leaf `#DCEAA5`, Manrope headings, Inter interface text. Translate existing tokens; do not invent a competing theme.

Implement the eight product screens: Discover, Details, Create, Evidence, Assessment, Community, Progress, Sign-in. Foundations, Components, Feedback, and Handoff are design reference pages, not product navigation.

Reusable components: AppShell, ChallengeCard, CategoryFilter, Field, PhotoInput, EvidenceForm, AssessmentSummary, OutcomeBadge, ContributionCard, ProgressMetric, ConfirmDialog, Toast.

Preserve labeled controls, inline errors, retained input, disabled duplicate submissions, visible keyboard focus, 44px targets, dialog focus management, and reduced-motion support. Essential feedback stays on the page rather than appearing only in a toast.

Remove prototype-only screen selectors, outcome switching, automatic supported results, fake confidence, placeholder people, and nonfunctional legal links. Generate dates, avatars, counts, and history from actual data. Cards must not all route to the cleanup example.

Assessment outcome wording follows the design. Do not use “verified,” certainty percentages, or claims that a photograph proves an activity occurred. Hide confidence for MVP unless its meaning and calibration are defensible. Keep the optional activity chart only when its values can be computed consistently with the history.

## 7. Recommended stack and architecture

These are proposed stack decisions, not inferred prior approvals. Use one TypeScript application to reduce setup and integration work.

| Layer | Recommendation | Reason |
|---|---|---|
| Frontend | Next.js App Router, React, TypeScript, existing CSS tokens | Shared language, responsive web delivery, direct use of design system |
| Backend | Next.js Node route handlers and service modules | Fresh backend inside one repository; avoids separate API deployment for MVP |
| Database | Fresh Tiger Cloud PostgreSQL service; Drizzle migrations | Matches Tiger Data preference; relational records and constraints fit this product |
| Identity | Fresh Firebase Authentication project; Google first | Managed identity; avoids building password infrastructure |
| Photos | Fresh private Cloud Storage for Firebase bucket | Authenticated direct uploads, private originals, controlled access |
| AI | Server-side Gemini API through Google's JavaScript SDK | Image input and structured assessment results |
| Hosting | Vercel for web/API | Early preview deployment and custom domain; confirm selected plan and service budgets |
| Repository | New GitHub repository named zyvara, subject to availability | Clean history and no accidental reuse of Grenes configuration |
| Delivery checks | GitHub Actions: typecheck, lint, meaningful tests, build | Catch integration failures before deployment |

Next.js supports HTTP route handlers in the app directory: [official documentation](https://nextjs.org/docs/app/getting-started/route-handlers). Tiger services connect through PostgreSQL clients: [connection documentation](https://www.tigerdata.com/docs/integrate/find-connection-details). Firebase supports [Google web authentication](https://firebase.google.com/docs/auth/web/google-signin) and [storage authorization rules](https://firebase.google.com/docs/storage/security). These capabilities support this architecture; they do not establish sponsor eligibility or zero cost.

Use ordinary PostgreSQL tables initially. Timescale features can support later time-series reporting, but hypertables and vectors are unnecessary for this MVP. Configure a bounded connection pool appropriate to the database and hosting limits; keep application and database regions close.

Architecture:

```text
Browser → Next.js pages and authenticated API → Tiger PostgreSQL
   │                     │
   ├→ Firebase Auth      ├→ private storage reads and authorized media access
   └→ private photo      └→ Gemini → validated assessment → reward transaction
       upload
```

Uploads go directly to storage, not through an API request carrying 20MB of photos. The server creates owner-bound upload slots, then validates stored objects before accepting a submission. Verify file signatures and decoding as well as reported MIME/size; limit decoded dimensions to resist oversized image payloads. Resize provider copies and remove EXIF metadata before analysis/publication.

For hackathon delivery, persist an assessment job and await the first Gemini attempt in a bounded API call. Do not launch an untracked process after responding. Refreshing the assessment page reads durable status. If the call crashes, its processing lease expires and a retry can safely claim it. This is resumable processing, not guaranteed unattended background completion. For pilot, add a durable queue/worker or scheduled recovery mechanism if jobs must finish without a returning user.

Hosting functions have request and execution limits; confirm the deployed configuration and keep the AI timeout below the configured duration: [Vercel limits](https://vercel.com/docs/functions/limitations). Never assume a browser disconnect guarantees provider cancellation or job completion.

## 8. Data model and integrity

| Record | Essential fields and rules |
|---|---|
| users | Internal ID, unique Firebase subject, display name, created time, role; email excluded from public responses |
| challenges | Creator, title, description, category, evidence requirements, optional deadline/timezone, status, version, timestamps |
| contributions | Owner, challenge, unique owner/challenge pair, description, latest evidence version, latest result, sharing consent, moderation status |
| evidence_versions | Contribution, version, requirement snapshot, description snapshot, submission time; immutable once finalized |
| media | Evidence version, owner, before/result role, private object key, byte count, verified type, checksum, sanitized derivative key; unique role per version |
| assessment_jobs | Evidence version, state, attempt count, lease expiry, last error, next eligible retry; at most one active processing attempt per version |
| assessments | Evidence version, model identifier, prompt version, outcome, observations, unmet criteria, feedback, next step, timing; retain assessment history |
| rewards | Contribution, award/reversal type, integer amount, reason, timestamp; unique support award per contribution |
| posts | Unique contribution, consent/publication timestamps, visibility status; feed includes only supported, consented, non-hidden content |
| likes/comments | User, post, timestamps; unique user/post like; comments bounded and deletable |
| reports/admin_actions | Reporter/admin, target, reason/action, timestamps; restricted access |

Use foreign keys and database constraints. Derive totals from the reward ledger and contribution records. Store the successful assessment and award in one transaction so a crash cannot leave an unexplained point balance. Publish or update a consented post within the same transaction where practical. Prevent a stale assessment from overwriting a newer evidence version.

## 9. API contract outline

All protected routes derive identity from a verified token/session, never a user ID supplied by the client. Each route checks ownership or role independently.

| Route | Purpose |
|---|---|
| GET /api/challenges | Published list with category, title search, and pagination |
| POST /api/challenges | Validate and publish an owned challenge |
| GET /api/challenges/:id | Challenge detail and true participation counts |
| POST /api/challenges/:id/close | Creator/admin closure |
| POST /api/uploads | Allocate evidence upload slots owned by the caller |
| POST /api/contributions | Finalize verified uploads and snapshot the requirements |
| GET /api/contributions/:id | Owner assessment status, evidence, feedback |
| POST /api/contributions/:id/assess | Claim persisted job and attempt Gemini assessment |
| POST /api/contributions/:id/revisions | Finalize improved evidence for a non-supported contribution |
| PUT /api/contributions/:id/sharing | Set or withdraw publication consent idempotently |
| GET /api/me/progress | Owner totals and paginated history |
| GET /api/community | Paginated supported, consented posts |
| PUT / DELETE /api/posts/:id/like | Secondary like/unlike |
| POST /api/reports | Pilot content reporting |
| POST /api/admin/moderation | Pilot audited hide/restore action |

Mutation idempotency keys, consistent validation errors, pagination limits, and per-user rate limits are part of the backend contract. Protect cookie-authenticated mutations against cross-site requests. Reject arbitrary image URLs; use only verified object references owned by the contribution.

## 10. Gemini assessment specification

Input: trusted application instructions, challenge requirement snapshot, user description, result image, optional before image. Treat user descriptions, creator requirements, and text appearing inside images as untrusted content; none may override the assessment policy.

Expected structured result:

```text
outcome: supported | needs_more_evidence | not_supported
observations: visible facts only
criteria: requirement + supported/unclear/not_supported + explanation
feedback: short, respectful summary
next_step: useful recovery instruction, or null for supported
```

Google documents [image understanding](https://ai.google.dev/gemini-api/docs/image-understanding) and [structured outputs](https://ai.google.dev/gemini-api/docs/structured-output). Use structured output and validate it again on the server. Valid JSON does not establish factual correctness.

Choose a currently available image-capable Flash model at kickoff, run the evaluation set, and pin its identifier in configuration. Record model and prompt versions with each assessment. Do not let a framework silently change the model during the event.

Policy:

- Supported: visible evidence aligns with assessable requirements. Identify which requirements are not photographically provable rather than claiming they were verified.
- Needs more evidence: unclear framing, missing visual context, ambiguity, or requirements that need an additional view. Explain what to change.
- Not supported: visible content contradicts or fails to show the requested action. Assess evidence rather than accusing the user.
- Provider error, blocked response, or invalid schema: assessment unavailable; saved evidence remains; no reward; offer safe retry.
- Criteria such as exact elapsed effort, responsible disposal, or personal authorship cannot be independently established from a still photo. Distinguish self-reported context from visible observations.

Prepare at least 12 consented/owned test submissions before model tuning: clear alignments, ambiguous images, mismatches, missing context, non-visual requirements, and text attempting to influence the model. Define expected outcome and reasoning first. Manually review every result, prioritizing false supported decisions and invented observations. This is a small behavioral check, not an accuracy certification.

## 11. Team ownership and ordered backlog

Henry owns fullstack implementation and integration. Teammate 2 owns AI. Teammate 3 owns Tiger Data. Keep database work delegated: Henry provides the service/API contract and reviews integration rather than absorbing another workstream. One person owns each deliverable; everyone reviews the central workflow.

| Workstream | Suggested owner | Deliverables |
|---|---|---|
| Fullstack/integration | Henry | Theme/screens, auth, API, uploads, assessment adapter, deployment, final integration |
| AI | Teammate 2 | Server-callable assessment function, structured schema, prompts, provider error mapping, owned-photo evaluation, Gemini demo explanation |
| Tiger Data | Teammate 3 | Fresh database, migrations, seed challenges, data access functions, transactional award function, history/progress query, persistence checks, sponsor evidence |

By 3:00 AM agree the callable interfaces: `assessEvidence(requirements, description, imageBytes)` returns the validated outcome contract; database functions finalize a contribution, persist an assessment/award atomically, and return progress. Teammates deliver runnable modules and example calls, not just research notes. Only Henry needs to own the deployed API boundary. Share credentials through private environment configuration, never commits or demo screenshots.

First backlog, in dependency order:

1. Create fresh project/repository configuration; deploy an empty branded shell.
2. Provision fresh services and agree data/schema/API contracts.
3. Prove production-domain Google sign-in, database access, and private photo upload.
4. Implement seeded challenge list and real per-challenge details.
5. Implement evidence finalization and durable assessment states.
6. Connect real Gemini; validate structured outputs and all three outcomes.
7. Add duplicate-safe reward transaction and personal history.
8. Add manual creation; test the created challenge through the entire journey.
9. Add consented publication and withdrawal.
10. Finish required responsive/error states and release checks.
11. Add likes, then comments/email/chart only if the core has passed.

Integrate small changes continuously. Freeze the schema/contract once the vertical slice works; necessary changes require an explicit migration and coordinated update. Keep one task board with Backlog, Ready, In progress, Review, Done, and a named owner. Limit each member to one principal task at a time.

## 12. Active deadline-driven delivery schedule

All times below are **CDT, Sunday October 11, 2026**. Planning check: 2:35 AM. Submission deadline: 1:00 PM. Target initial submission: **12:15 PM**.

| Window | Work and exit gate |
|---|---|
| Now–3:00 AM | Lock critical slice and module interfaces; new repo; deploy shell; everyone starts their confirmed workstream |
| 3:00–4:00 AM | Henry: theme, Google auth, storage proof. AI teammate: real image-to-schema call. Tiger teammate: database connection, migration, seed data. Exit: all three service proofs work |
| 4:00–6:00 AM | Henry: discover/detail/evidence screens and API. AI teammate: three outcomes and recovery guidance. Tiger teammate: contribution/history/reward functions. Integrate one real submission |
| 6:00–8:00 AM | Complete live evidence → Gemini → atomic reward → progress. Test refresh/retry/privacy. Exit: two users complete the loop on deployment |
| 8:00 AM checkpoint | If core is stable, add minimal manual creation, then optional sharing. If unstable, cut both from today's delivery and fix core. No likes/comments/email/chart work |
| 8:00–9:30 AM | Finish only feasible creation/sharing; mobile pass, error states, persistence check. Tiger teammate starts README/submission evidence; AI teammate prepares evaluation and demo photos |
| 9:30 AM | Feature freeze. Every additional change must fix a core failure or submission requirement |
| 9:30–10:30 AM | Final deployed checks, custom domain/HTTPS, fallback deployment URL, two-account test, points/consent checks; accurately list incomplete features |
| 10:30–11:30 AM | Prepare Devpost narrative, repository/website links, team names, sponsor selections, screenshots, optional recording; rehearse a 3-minute demo |
| 11:30 AM–12:15 PM | Review submission as a judge would, verify links and demo data; submit by 12:15 PM |
| 12:15–1:00 PM | Confirm submitted status, check mandatory fields and URL access; fix submission-blocking issues. Preserve stable tagged version |

Critical path: service access → identity/database/storage → evidence finalization → Gemini → atomic reward/history → deployed verification. Frontend polish can proceed alongside this path, but cannot substitute for it. Manual creation and social publication are post-core scope for today.

If any service proof is missing at 4 AM, timebox that blocker to 30 minutes, decide its fallback, and update the scope immediately. If Google auth cannot be completed, use a restricted, clearly labeled demonstration session with owner-scoped access and rate limits; do not expose anonymous public writes to private records. If real AI is unavailable, demonstrate saved real outputs or a labeled replay and describe the integration's status; never manufacture a live successful assessment.

After the competition, complete M05/M10 if deferred, then the pilot gate. A rough follow-on allocation is 2–3 focused days for missing member workflows, 2–3 for moderation/deletion/recovery and hardening, and 1–2 for pilot preparation. Re-estimate from actual submission-day completion rather than treating these as guarantees.

## 13. Risk register and fallback decisions

| Risk | Early check | Response |
|---|---|---|
| Unconfirmed deadline/team | Kickoff | Rescale relative schedule; preserve core release gates |
| Tiger service/credit access | H2–H6 | Timebox provisioning; if unavailable, use a fresh managed PostgreSQL service and document the sponsor tradeoff |
| Firebase storage billing/setup | H2–H6 | Verify bucket access and billing before UI integration; if blocked, switch to private S3-compatible storage using the same access contract |
| Gemini quota/latency | First photo proof | Bound retries, reduce provider image size, show saved pending/error states; real previous result or clearly labeled demo mode for fallback presentation |
| False supported decisions | Evaluation before reward integration | Tighten criteria/prompt; never claim independent verification; retain assessment provenance |
| Duplicate awards/stale results | Integration | Database uniqueness, transactional ledger, job lease, evidence version checks |
| Accidental public evidence | Before community | Private storage, server authorization, consent filtering, sanitized media, withdrawal test |
| Auth/domain redirect failure | Early deployment | Test deployed domain and preview configuration immediately; keep provider URL as demo fallback |
| Last-minute integration | Every milestone | Deploy early, integrate small changes, freeze features before rehearsal |
| Abuse of public creation/feed | Before pilot | Rate limits, reporting, moderator hiding, explicit access role |

No silent stack switching: record the reason and update setup instructions. Do not create multiple fallback systems preemptively.

## 14. Verification and definition of done

Required automated checks should cover risk-bearing behavior: protected write authorization, private media access, input validation, deadline eligibility, outcome-to-reward mapping, repeat/concurrent reward requests, stale result rejection, consent filtering, and progress reconciliation. Add an end-to-end test of the principal journey with controlled model responses; separately exercise the actual Gemini service on the small evaluation set.

Manual deployed acceptance:

- New account signs in on the intended domain, creates a challenge, and another account can discover it.
- Submit a real allowed image and description; refresh during processing; evidence remains.
- All three AI outcomes and provider failure produce the right recovery and point result.
- Repeated requests and evidence revisions never duplicate an award.
- Progress totals equal stored rewards and supported contributions.
- User A cannot read or mutate User B's private evidence; public endpoints cannot leak private storage URLs or emails.
- Sharing defaults off; explicit sharing publishes the correct content; withdrawal removes public access.
- Deadline boundaries, closed challenge, invalid photo, oversized photo, canceled upload, and failed provider call recover clearly.
- Keyboard use, visible focus, dialogs, form errors, and 390px/768px/1440px layouts work.
- Production has no visible sample counts, dummy results, fake confidence, or preview-only controls.

Release evidence: successful build/checks, completed acceptance checklist, deployed URL, migration history, configured secret inventory without secret values, model/prompt identifiers, known limitations, tagged commit, and demo recording. Critical defects affecting identity, private evidence, persistence, or points block release. Small cosmetic defects can be documented.

## 15. Pilot operations, measurement, and cost

Before opening a small pilot, publish accurate privacy/terms/contact information, explain photos are sent to Google for assessment, establish retention/deletion behavior, and identify the person handling reports. Set production and preview environments apart; previews must not access real participants' private evidence.

Keep API/database/service-account credentials server-only. Track request/job IDs, upload failures, AI latency/failure, retry counts, and reward transaction failures without logging private image content or full descriptions. Clean abandoned uploads and expire stalled processing leases. Document backup/restore and deploy rollback procedures; a code rollback does not automatically undo a database migration.

Cost proposal: establish an owner-approved spending cap before enabling paid services; provisionally use $50 for the event as a budget envelope, not a provider quote. Verify current plan prices, billing prerequisites, sponsor credits, API quotas, and trial expiry in the actual accounts. Track database compute, storage/egress, hosting, and Gemini separately. Estimate monthly cost from expected submissions × measured AI cost plus fixed service and media costs. Do not claim all services are free.

Suggested pilot: 10–20 students, several clearly assessable challenges, one club organizer. This is a proposed research cohort, not an established user base.

Success measures:

- Deployment gate: two independent accounts complete the entire loop and privacy checks pass.
- Pilot activation: at least 10 participants finalize an evidence submission within the pilot period.
- Usability target: at least 80% of participants asked to try the core flow finish without direct help.
- Reliability target: at least 90% of eligible submissions receive a valid assessment within 60 seconds under pilot load; measure failures and latency separately.
- Value signal: participants can explain their feedback and at least several choose another challenge.

These are hypotheses and operational targets, not forecast results. Capture discovery, detail opened, auth completion, finalized evidence, result shown, shared/withdrawn, and second contribution events. Avoid analytics containing photos or private narrative text. Environmental benefit is represented by documented actions, not calculated emissions.

## 16. Demonstration and handoff

Prepare a 3-minute story: a student wants one manageable action; they find the campus cleanup challenge, understand the requirements, upload owned evidence, receive real Gemini feedback, see recognition in their journal, and explicitly share it. Briefly show unclear-evidence recovery to demonstrate useful feedback rather than a forced success.

Suggested timing: problem/audience 20 seconds; discovery/details 25; evidence 35; assessment explanation 35; progress/community 25; architecture/sponsor use 20; limitations and next step 20. Use a rehearsal-tested live example. Have a recording and a previously completed real assessment available if the provider is unavailable; label replay/demo material clearly. Prepare sponsor evidence only for services actually integrated, and check competition rules before claiming eligibility.

Handoff package: repository README with fresh setup, environment variable names, migrations/seed instructions, API/rules notes, acceptance checklist, privacy/moderation/deletion procedures, demo fixtures and recording, deployed link, known limitations, and prioritized post-MVP backlog.

The next implementation action is the deployed service proof and first real cleanup journey. Do not restart design exploration or rewrite the prototype as if its demonstrations already constitute application behavior.

## 17. Decisions awaiting confirmation

Confirmed: three people, Henry fullstack, teammate 2 AI, teammate 3 Tiger Data, Sunday October 11 at 1 PM CDT deadline. Proposed defaults still awaiting adoption: Next.js/TypeScript, fresh Tiger PostgreSQL, Firebase Auth/Storage, Vercel, an available Gemini Flash model, 50 points once per member/challenge, Google-only initial member auth, campus-first pilot. Confirm account access/budget and reward policy quickly; these decisions do not require another design phase.

## 19. Verified competition requirements and prize strategy

[Devpost](https://codered-orion-ccs.devpost.com/) confirms the 1 PM CDT deadline, requires hosted website and repository submission, and lists Environmental Hack alongside Gemini, Tiger Data, and GoDaddy tracks. The [rules](https://codered-orion-ccs.devpost.com/rules) specify a 1–4 person team, a new project within the October 10 1 PM–October 11 1 PM hacking period, and a functioning demonstration. Submit the hosted app and repo even though the rules also describe local demonstration as a minimum.

Because Grenes predates the event, keep it as disclosed prior context and build fresh implementation during the permitted period. A new repository alone does not establish originality. Document what was newly built and any prior assets/code used; ask the organizers about eligibility if prior implementation is reused. The event links [MLH's standard rules](https://github.com/MLH/mlh-policies/blob/main/standard-hackathon-rules.md); check those alongside organizer guidance.

Recommended track priorities:

| Track | Evidence to show |
|---|---|
| Best Environment Hack | Campus cleanup use case, practical action, documented participation, intended club/student audience |
| Best Use of Gemini API | Actual photo assessment, meaningful recovery feedback, model/prompt version, saved real results |
| Best Use of Tiger Data | Actual challenge/contribution/assessment/reward persistence, transactional correctness, live SQL-derived personal progress |
| Best Domain Name from GoDaddy Registry | zyvara.us registration and functioning site; verify sponsor-specific registration eligibility/code conditions |
| Best Pitch/Demo / Overall | A stable core journey and credible user/problem story; enter according to submission form options |

The [MLH prize page](https://www.mlh.com/events/codered-orion/prizes) confirms Gemini, Tiger Data, and GoDaddy categories. Its Tiger description emphasizes innovative and impactful use; merely connecting a database is weak prize differentiation. If the core is complete, let the Tiger teammate add a small real daily-contribution query/chart, but do not add time-series infrastructure that jeopardizes delivery. Do not add ElevenLabs, Solana, Backboard, or Vultr solely for another prize category.

Create the Devpost draft early. Include project purpose, intended users, what works, stack, sponsor integrations actually used, challenges, next steps, team attribution, hosted URL, repository URL, and truthful prior-work disclosure. A recording is a recommended fallback, not a verified mandatory requirement. Confirm any additional fields and track-specific conditions in the actual submission form before 12:15 PM.

## 18. Legacy review notes

The [Grenes README](https://github.com/henryagyare/grenes/blob/master/README.md) describes Kotlin Multiplatform, a Ktor server, Firebase, and a separate Vue admin app, with iOS untested. The [challenge model](https://github.com/henryagyare/grenes/blob/master/shared/src/commonMain/kotlin/me/ayitinya/grenes/data/challenges/Challenge.kt) contains title, description, creator, types, and dates. The [feed service](https://github.com/henryagyare/grenes/blob/master/server/src/main/kotlin/me/ayitinya/grenes/data/feed/DefaultFeedService.kt) contains reactions, comments, badge logic, and coroutine-launched media uploads. In the reviewed [challenge routes](https://github.com/henryagyare/grenes/blob/master/server/src/main/kotlin/me/ayitinya/grenes/routing/ChallengeRoutes.kt), the authentication wrapper is commented out.

These observations justify retaining product concepts while replacing authorization and upload processing patterns. This was a targeted source review, not a build verification or full security audit. No repository or external account was changed during planning.
