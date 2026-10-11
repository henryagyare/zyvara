"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import { Camera, ArrowRight, Check, AlertTriangle } from "lucide-react";
import { api, send, type Challenge, type ContributionDetail } from "./api";
import { useSession, MemberGate } from "./app";
import {
  Heading,
  Field,
  ErrorNotice,
  Loading,
  Outcome,
  ConfirmDialog,
  formError,
  useResource,
  date,
} from "./shared";
type Photo = {
  file: File | null;
  preview: string;
  uploadId: string | null;
  error: string;
};
const emptyPhoto = (): Photo => ({
  file: null,
  preview: "",
  uploadId: null,
  error: "",
});
async function uploadBytes(file: File): Promise<Blob> {
  if (file.size <= 3 * 1024 * 1024) return file;
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "This browser could not prepare your photo. Choose a smaller photo.",
      );
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8),
    );
    if (!blob || blob.size > 3 * 1024 * 1024)
      throw new Error("Choose a smaller photo to upload.");
    return blob;
  } finally {
    image.close();
  }
}
async function uploadPhoto(
  photo: Photo,
  role: string,
  onSaved: (id: string) => void,
) {
  if (photo.uploadId) return photo.uploadId;
  if (!photo.file) throw new Error("Choose a result photo before submitting.");
  const bytes = await uploadBytes(photo.file);
  const slot = await send<{
    id: string;
    url: string;
    direct: boolean;
    headers: Record<string, string>;
  }>("uploads", { role, mime: bytes.type });
  const response = await fetch(slot.url, {
    method: "PUT",
    headers: slot.headers,
    body: bytes,
  });
  if (!response.ok) {
    const failure = await response.json().catch(() => null);
    throw new Error(
      failure?.error ||
        "Photo upload failed. Your description and selections are retained. Try again.",
    );
  }
  await send("uploads/" + slot.id + "/finalize", {});
  onSaved(slot.id);
  return slot.id;
}
export function Evidence({
  challengeId,
  revision,
}: {
  challengeId: string;
  revision: string | null;
}) {
  return (
    <MemberGate>
      <EvidenceForm
        key={challengeId + revision}
        challengeId={challengeId}
        revision={revision}
      />
    </MemberGate>
  );
}
function EvidenceForm({
  challengeId,
  revision,
}: {
  challengeId: string;
  revision: string | null;
}) {
  const { config } = useSession();
  const router = useRouter();
  const {
    data: challenge,
    error: loadError,
    loading,
    reload,
  } = useResource<Challenge>("challenges/" + challengeId);
  const previous = useResource<ContributionDetail>(
    revision ? "contributions/" + revision : null,
  );
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<Photo>(emptyPhoto);
  const [before, setBefore] = useState<Photo>(emptyPhoto);
  const [consent, setConsent] = useState(false);
  const [scenario, setScenario] = useState("needs_more_evidence");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const restored = useRef(false);
  useEffect(() => {
    if (previous.data && !restored.current) {
      restored.current = true;
      setDescription(previous.data.evidence.description);
    }
  }, [previous.data]);
  const resultPreview = result.preview;
  const beforePreview = before.preview;
  useEffect(
    () => () => {
      if (resultPreview) URL.revokeObjectURL(resultPreview);
    },
    [resultPreview],
  );
  useEffect(
    () => () => {
      if (beforePreview) URL.revokeObjectURL(beforePreview);
    },
    [beforePreview],
  );
  function choose(
    file: File | undefined,
    setPhoto: (value: Photo | ((p: Photo) => Photo)) => void,
  ) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhoto((p) => ({ ...p, error: "Choose a JPEG, PNG, or WebP photo." }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhoto((p) => ({ ...p, error: "Choose a photo up to 10 MB." }));
      return;
    }
    setPhoto({
      file,
      preview: URL.createObjectURL(file),
      uploadId: null,
      error: "",
    });
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!result.file) {
      setResult((p) => ({ ...p, error: "A result photo is required." }));
      document.getElementById("result-photo")?.focus();
      return;
    }
    setBusy(true);
    setError("");
    setFields({});
    try {
      setStage("Uploading result photo…");
      const resultId = await uploadPhoto(result, "result", (id) =>
        setResult((p) => ({ ...p, uploadId: id })),
      );
      let beforeId: string | null = null;
      if (before.file) {
        setStage("Uploading before photo…");
        beforeId = await uploadPhoto(before, "before", (id) =>
          setBefore((p) => ({ ...p, uploadId: id })),
        );
      }
      setStage("Saving your evidence…");
      const contribution = await send<{ id: string }>("contributions", {
        challengeId,
        description,
        resultUploadId: resultId,
        beforeUploadId: beforeId,
        consent,
        ...(config?.scenarioSelection ? { scenario } : {}),
      });
      router.push("/assessment/" + contribution.id);
    } catch (e) {
      setError(formError(e, setFields));
    } finally {
      setBusy(false);
      setStage("");
    }
  }
  if (loadError) return <ErrorNotice message={loadError} retry={reload} />;
  if (loading || !challenge)
    return <Loading label="Loading evidence requirements…" />;
  const closed =
    challenge.status === "closed" ||
    (!!challenge.deadline && new Date(challenge.deadline) < new Date());
  if (closed)
    return (
      <>
        <Heading
          title="This challenge is closed"
          subtitle="Evidence can no longer be accepted for this challenge."
        />
        <Link className="btn" href="/">
          Find another challenge
        </Link>
      </>
    );
  function photoInput(
    role: "result" | "before",
    photo: Photo,
    setPhoto: typeof setResult,
  ) {
    return (
      <div className="upload-slot">
        <label className="label" htmlFor={role + "-photo"}>
          {role === "result"
            ? "Result photo (required)"
            : "Before photo (optional)"}
        </label>
        <div className="upload-area">
          {photo.preview ? (
            <img
              className="photo-preview"
              src={photo.preview}
              alt={role + " photo preview"}
            />
          ) : (
            <>
              <Camera size={32} aria-hidden="true" />
              <strong>Choose {role} photo</strong>
              <span className="small muted">JPEG, PNG, WebP · Up to 10 MB</span>
            </>
          )}
          <input
            id={role + "-photo"}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => choose(e.target.files?.[0], setPhoto)}
            aria-describedby={role + "-help"}
            aria-invalid={!!photo.error}
          />
        </div>
        <span
          id={role + "-help"}
          className={photo.error ? "photo-error" : "helper"}
        >
          {photo.error ||
            photo.file?.name ||
            "Use your own photo. Avoid private information."}
        </span>
        {photo.file && (
          <button
            className="btn secondary compact"
            type="button"
            disabled={busy}
            onClick={() => setPhoto(emptyPhoto())}
          >
            Remove {role} photo
          </button>
        )}
      </div>
    );
  }
  return (
    <>
      <Heading
        title={
          revision ? "Give your evidence another look" : "Document your action"
        }
        subtitle="A photo and a few thoughtful words tell the story."
        crumb={
          <Link href={"/challenges/" + challengeId}>
            {challenge.title} / Submit evidence
          </Link>
        }
      />
      <div className="columns">
        <form className="panel wide" onSubmit={submit}>
          {error && <ErrorNotice message={error} />}
          <div className="upload-grid">
            {photoInput("result", result, setResult)}
            {photoInput("before", before, setBefore)}
          </div>
          <Field
            name="description"
            label="What did you do?"
            help="Describe your action, where you worked, and how you met the requirements. Up to 2,000 characters."
            error={fields.description}
          >
            <textarea
              id="description"
              required
              maxLength={2000}
              value={description}
              disabled={busy}
              onChange={(e) => setDescription(e.target.value)}
              aria-describedby="description-help"
              aria-invalid={!!fields.description}
            />
          </Field>
          <label className="check-row">
            <input
              type="checkbox"
              checked={consent}
              disabled={busy}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              <strong>Share with the community if supported</strong>
              <br />
              <span className="helper">
                Publish my display name, description, selected photos,
                challenge, and assessment status. I can withdraw sharing later.
              </span>
            </span>
          </label>
          {config?.scenarioSelection && (
            <div className="feedback-note">
              <Field
                name="scenario"
                label="Development assessment fixture"
                help="Test scenarios only. This is a simulation, not photographic analysis."
              >
                <select
                  id="scenario"
                  value={scenario}
                  disabled={busy}
                  onChange={(e) => setScenario(e.target.value)}
                >
                  <option value="needs_more_evidence">
                    Needs more evidence
                  </option>
                  <option value="supported">Supported</option>
                  <option value="not_supported">Not supported</option>
                  <option value="failure_once">
                    Fails once, then supports on retry
                  </option>
                  <option value="failure">Provider failure</option>
                </select>
              </Field>
            </div>
          )}
          <div className="form-actions">
            <Link href={"/challenges/" + challengeId} className="btn secondary">
              Back to challenge
            </Link>
            <button className="btn" disabled={busy}>
              {busy ? stage : "Save evidence & assess"}
              <ArrowRight size={18} />
            </button>
          </div>
          <p className="helper" role="status">
            {busy
              ? stage
              : "Your evidence stays private unless you choose to share a supported contribution."}
          </p>
        </form>
        <aside className="rail panel field-notes">
          <h3>Before you submit</h3>
          <ul>
            {challenge.requirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <section>
            <strong>A clear result matters</strong>
            <p className="muted">
              Show the completed action. A before photo can add context, but is
              optional.
            </p>
          </section>
          <section>
            <strong>Keep people and places safe</strong>
            <p className="muted">
              Avoid faces, addresses, and other private details.
            </p>
          </section>
          {config?.simulatedAssessment && (
            <section>
              <strong>Simulated assessment</strong>
              <p className="muted">
                This provider exercises the application workflow. It does not
                analyze your photo.
              </p>
            </section>
          )}
          {config?.simulatedAssessment === false && (
            <section>
              <strong>Google Gemini assessment</strong>
              <p className="muted">
                Submitting sends sanitized photos, your description, and
                challenge requirements to Google Gemini for assessment.
                Community sharing remains your choice.{" "}
                <Link href="/privacy">Privacy details</Link>
              </p>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
export function AssessmentPage({ id }: { id: string }) {
  return (
    <MemberGate>
      <AssessmentResult key={id} id={id} />
    </MemberGate>
  );
}
function AssessmentResult({ id }: { id: string }) {
  const { config } = useSession();
  const router = useRouter();
  const { data, error, loading, reload, setData } =
    useResource<ContributionDetail>("contributions/" + id);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const autoStarted = useRef(false);
  const assess = useCallback(async () => {
    setBusy(true);
    setActionError("");
    try {
      setData(
        await send<ContributionDetail>("contributions/" + id + "/assess", {}),
      );
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [id, setData]);
  useEffect(() => {
    if (data?.job.state === "pending" && !autoStarted.current) {
      autoStarted.current = true;
      const timer = setTimeout(() => void assess(), 0);
      return () => clearTimeout(timer);
    }
  }, [data?.job.state, assess]);
  useEffect(() => {
    if (data?.job.state !== "processing") return;
    const timer = setTimeout(reload, 2500);
    return () => clearTimeout(timer);
  }, [data, reload]);
  if (error) return <ErrorNotice message={error} retry={reload} />;
  if (!data || loading) return <Loading label="Opening saved assessment…" />;
  const result = data.assessment;
  const pending =
    busy || data.job.state === "pending" || data.job.state === "processing";
  return (
    <>
      <Heading
        title={
          pending
            ? "Your evidence is saved"
            : data.job.state === "failed"
              ? "Your evidence is safe"
              : "A little action, recorded"
        }
        subtitle={data.challenge.title}
        crumb={
          <Link href={"/challenges/" + data.challenge.id}>
            Challenge / Assessment
          </Link>
        }
      />
      <div className="columns">
        <div className="wide stack">
          {actionError && <ErrorNotice message={actionError} />}
          {(result?.simulated ?? config?.simulatedAssessment) && (
            <div className="feedback-note">
              <strong>Simulated assessment.</strong> The current provider uses a
              deterministic test fixture. It does not perform photographic
              analysis or independently verify activity.
            </div>
          )}
          {pending ? (
            <section className="panel" role="status">
              <div className="row">
                <span className="loading-dot" />
                <h2>
                  {data.job.state === "processing"
                    ? "Processing your saved evidence…"
                    : "Starting the assessment…"}
                </h2>
              </div>
              <p className="muted">
                You can refresh or return later. Your photos and description are
                stored.
              </p>
              <button
                className="btn secondary"
                disabled={busy}
                onClick={() => void assess()}
              >
                Check or resume assessment
              </button>
            </section>
          ) : data.job.state === "failed" ? (
            <section className="panel">
              <span className="status error">
                <AlertTriangle size={18} />
                Assessment unavailable
              </span>
              <h2>No points were awarded</h2>
              <p>{data.job.error}</p>
              <p className="muted">
                Retry uses your saved evidence. You do not need to upload again.
              </p>
              <button
                className="btn"
                disabled={busy || data.job.attempts >= 5}
                onClick={() => void assess()}
              >
                {busy ? "Retrying…" : "Retry assessment"}
              </button>
              {data.job.attempts >= 5 && (
                <Link
                  href={"/evidence/" + data.challenge.id + "?revision=" + id}
                  className="btn secondary"
                >
                  Submit revised evidence
                </Link>
              )}
            </section>
          ) : (
            result && (
              <>
                <section className="assessment-panel">
                  <Outcome outcome={result.outcome} />
                  <h2>
                    {result.outcome === "supported"
                      ? "A contribution worth recognizing"
                      : result.outcome === "needs_more_evidence"
                        ? "A clearer picture would help"
                        : "Review the challenge requirements"}
                  </h2>
                  <p>{result.feedback}</p>
                  {result.outcome === "supported" && (
                    <div className="row">
                      <span className="reward">+{data.points}</span>
                      <div>
                        <strong>Participation points</strong>
                        <p className="muted">
                          Awarded once for this contribution.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="divider" />
                  <h3>Your next step</h3>
                  <p>{result.nextStep}</p>
                  <div className="button-row">
                    <Link
                      className="btn"
                      href={
                        result.outcome === "supported"
                          ? "/progress"
                          : "/evidence/" + data.challenge.id + "?revision=" + id
                      }
                    >
                      {result.outcome === "supported"
                        ? "View my progress"
                        : "Improve my evidence"}
                      <ArrowRight size={18} />
                    </Link>
                    {result.outcome === "supported" &&
                      (data.contribution.consent ? (
                        <ConfirmDialog
                          title="Withdraw community sharing?"
                          description="Your photos and story will disappear from the public feed. Your recognition remains in your private journal."
                          trigger="Withdraw sharing"
                          confirm="Withdraw sharing"
                          onConfirm={async () => {
                            await send(
                              "contributions/" + id + "/sharing",
                              { consent: false },
                              "PUT",
                            );
                            reload();
                          }}
                        />
                      ) : (
                        <ConfirmDialog
                          title="Share your contribution?"
                          description="Your display name, description, selected photos, challenge, and assessment status will be visible to everyone. Check for private details before sharing."
                          trigger="Share contribution"
                          confirm="Publish contribution"
                          onConfirm={async () => {
                            await send(
                              "contributions/" + id + "/sharing",
                              { consent: true },
                              "PUT",
                            );
                            reload();
                          }}
                        />
                      ))}
                  </div>
                </section>
                <section className="panel">
                  <h2>Assessment details</h2>
                  <h3>Visible observations</h3>
                  <ul>
                    {result.observations.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                  <h3>Each requirement</h3>
                  <div className="requirement-list">
                    {result.requirements.map((r, i) => (
                      <div className="requirement-result" key={i}>
                        {r.status === "supported" ? (
                          <Check size={20} />
                        ) : (
                          <AlertTriangle size={20} />
                        )}
                        <div>
                          <strong>{r.requirement}</strong>
                          <p>
                            {r.status.replaceAll("_", " ")} · {r.explanation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="helper">Provider: {result.provider}</p>
                </section>
              </>
            )
          )}
          <section className="panel">
            <h2>Your saved description</h2>
            <p>{data.evidence.description}</p>
            <p className="helper">
              Evidence version {data.evidence.version} · Accepted{" "}
              {date(data.evidence.acceptedAt)}
            </p>
          </section>
        </div>
        <aside className="rail stack">
          <section className="panel">
            <h3>Your evidence</h3>
            <img
              className="assessment-photo"
              src={"/api/media/" + data.evidence.resultUploadId}
              alt="Your submitted result"
            />
            {data.evidence.beforeUploadId && (
              <>
                <h3>Before photo</h3>
                <img
                  className="assessment-photo"
                  src={"/api/media/" + data.evidence.beforeUploadId}
                  alt="Your optional before photo"
                />
              </>
            )}
            <p className="helper">
              {data.contribution.consent && result?.outcome === "supported"
                ? "Sharing is on. This contribution is public."
                : "Sharing is off. Evidence is private."}
            </p>
          </section>
          <ConfirmDialog
            title="Delete this contribution?"
            description="Your photos and description will be removed and public sharing will stop. The minimal participation and reward ledger remains to prevent repeat rewards."
            trigger="Delete contribution"
            confirm="Delete contribution"
            danger
            onConfirm={async () => {
              await api("contributions/" + id, { method: "DELETE" });
              router.push("/progress");
            }}
          />
        </aside>
      </div>
    </>
  );
}
