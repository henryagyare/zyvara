"use client";
import Image from "next/image";
import { useState } from "react";
import { send, type ContributionDetail } from "./api";
import { ErrorNotice, Loading, useResource } from "./shared";

export function CreatorReview({ challengeId }: { challengeId: string }) {
  const { data, error, loading, reload } = useResource<{
    submissions: ContributionDetail[];
  }>("challenges/" + challengeId + "/submissions");
  return (
    <section className="panel">
      <h2>Review submissions</h2>
      <p>
        Review each member’s evidence after Gemini. Your decision and reason are
        saved separately from the AI feedback. Denial removes recognition and
        community sharing; approval awards the submission’s saved points once.
      </p>
      {error && <ErrorNotice message={error} retry={reload} />}
      {loading && <Loading label="Loading submissions…" />}
      {data?.submissions.length === 0 && <p>No submissions yet.</p>}
      {data?.submissions.map((row) => (
        <ReviewCard key={row.evidence.id} row={row} reload={reload} />
      ))}
    </section>
  );
}
function ReviewCard({
  row,
  reload,
}: {
  row: ContributionDetail;
  reload: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function decide(decision: "approve" | "deny") {
    setBusy(true);
    setError("");
    try {
      await send("contributions/" + row.contribution.id + "/review", {
        evidenceId: row.evidence.id,
        decision,
        reason,
      });
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const label = "Review reason for submission " + row.contribution.id;
  return (
    <article className="review-card">
      <h3>Submission · Version {row.evidence.version}</h3>
      <p>{row.evidence.description}</p>
      <p className="helper">
        Reward for this submission: {row.contribution.rewardPoints} points.
      </p>
      <Image
        className="review-photo"
        src={"/api/media/" + row.evidence.resultUploadId}
        alt="Submitted result evidence"
        width={640}
        height={480}
        unoptimized
      />
      {row.evidence.beforeUploadId && (
        <Image
          className="review-photo"
          src={"/api/media/" + row.evidence.beforeUploadId}
          alt="Submitted before evidence"
          width={640}
          height={480}
          unoptimized
        />
      )}
      {row.assessment ? (
        <>
          <strong>Gemini: {row.assessment.outcome.replaceAll("_", " ")}</strong>
          <p>{row.assessment.feedback}</p>
          <ul>
            {row.assessment.requirements.map((r, i) => (
              <li key={i}>
                {r.requirement}: {r.status.replaceAll("_", " ")} —{" "}
                {r.explanation}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>Waiting for the member’s AI assessment to complete.</p>
      )}
      {row.review ? (
        <div className="feedback-note">
          <strong>
            {row.review.decision === "approve" ? "Approved" : "Denied"} by
            creator
          </strong>
          <p>{row.review.reason}</p>
        </div>
      ) : (
        row.job.state === "completed" && (
          <>
            <label htmlFor={row.evidence.id}>{label}</label>
            <textarea
              id={row.evidence.id}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={2000}
              disabled={busy}
              aria-describedby={row.evidence.id + "-count"}
            />
            <p className="helper" id={row.evidence.id + "-count"}>
              {reason.length} / 2,000 characters
            </p>
            <div className="button-row">
              <button
                className="btn"
                disabled={busy || !reason.trim()}
                onClick={() => void decide("approve")}
              >
                Approve submission
              </button>
              <button
                className="btn secondary"
                disabled={busy || !reason.trim()}
                onClick={() => void decide("deny")}
              >
                Deny submission
              </button>
            </div>
            <p className="helper">
              The decision is final for this evidence version. A denied member
              can submit a revised version.
            </p>
          </>
        )
      )}
      {error && <ErrorNotice message={error} />}
    </article>
  );
}
