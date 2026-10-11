# Assessment adapter contract

The AI teammate owns a new provider module. This application currently makes **no Gemini calls** and requires no Gemini key. `src/server/assessment.ts` defines the exact TypeScript interface and Zod result validator. Fullstack owns orchestration, jobs, authorization, revisions, rewards, and publication.

```ts
interface AssessmentInput {
  requirements: string[];              // immutable challenge snapshot
  description: string;                // immutable submission snapshot
  resultImage: { bytes: Buffer; mime: 'image/webp'; checksum: string };
  beforeImage?: { bytes: Buffer; mime: 'image/webp'; checksum: string };
  evidenceVersion: number;
  requestId: string;                   // unique attempt identifier
}
interface AssessmentProvider {
  readonly id: string;
  readonly simulated: boolean;         // true only for mock/replay providers
  assess(input: AssessmentInput, context: {
    scenario: 'supported' | 'needs_more_evidence' | 'not_supported' | 'failure' | 'failure_once';
    attempt: number;
  }): Promise<AssessmentResult>;
}
```

Return this shape, with one requirement entry in the same order for every input requirement:

```json
{
  "outcome": "needs_more_evidence",
  "observations": ["Describe only observations grounded in the supplied evidence."],
  "requirements": [{"requirement":"Exact snapshotted requirement","status":"unclear","explanation":"Explain the limitation."}],
  "feedback": "Useful, considerate feedback.",
  "nextStep": "A practical next action.",
  "provider": "provider/model/prompt-version identifier",
  "simulated": false
}
```

Outcomes: `supported`, `needs_more_evidence`, `not_supported`. Requirement statuses: `supported`, `unclear`, `not_supported`. A supported outcome must have every requirement supported. Unsupported/invalid output and thrown errors never authorize points. Do not return a reward amount. Do not query or write the database in the provider. Do not accept a client user ID or fixture as authorization. Do not log photos, descriptions, keys, or private URLs. The adapter receives sanitized bytes, not publicly accessible URLs.

The mock has deterministic fixtures: `supported`, `needs_more_evidence`, `not_supported`, `failure`, `failure_once`. Set `MOCK_SCENARIO` on the server. Scenario selection in the evidence form is restricted to development or `DEMO_MODE=true`; no such controls are permitted for ordinary production users. The default is `needs_more_evidence`, never an automatic successful award. `failure_once` fails the first attempt and succeeds on retry using the same stored evidence. Jobs persist the selected server-approved fixture.

Install the teammate module beside `assessment.ts` and return it from `getAssessmentProvider()` based on `ASSESSMENT_PROVIDER`. Set the provider's `simulated` flag to false and revise the privacy copy before activating live analysis. UI labeling derives from provider configuration and persisted result flags. No changes to evidence finalization, the job runner, reward transaction, progress queries, or storage authorization should be required.

The runner persists pending → processing → completed/failed, a unique request ID, attempt count, error, 60-second lease, and a 2-second retry cooldown. It awaits the provider within a 25-second application timeout. The provider should implement its own request cancellation/timeout below 25 seconds; JavaScript timeout alone does not cancel an external request. Maximum five attempts per evidence version. A returning owner can resume an expired lease. This is resumable request processing, not a continuously running worker.

Assessments and awards commit in one transaction. The runner locks the contribution and job, checks the request ID and latest evidence version, and inserts a reward with a unique contribution key. Late results may remain in assessment history but cannot change the current outcome or award points. Evidence revisions reuse the contribution and create immutable version rows. An already supported contribution cannot be revised to earn more rewards.

Test with `pnpm test`. Add provider contract tests in the AI module; do not change the fullstack reward or sharing rules. Preserve the existing mock for reproducible integration tests.
