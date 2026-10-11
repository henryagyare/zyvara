"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Leaf, Flag, Shield } from "lucide-react";
import { send, type Post, type Progress } from "./api";
import { Sprout } from "./art";
import { useSession, MemberGate } from "./app";
import {
  Heading,
  ErrorNotice,
  Empty,
  Loading,
  Outcome,
  Field,
  date,
  useResource,
} from "./shared";
export function Community() {
  const { config } = useSession();
  const { data, error, loading, reload } = useResource<{ posts: Post[] }>(
    "community",
  );
  return (
    <>
      <Heading
        title="Good things grow together"
        subtitle="Shared contributions. Practical ideas. A little encouragement."
      />
      <div className="columns">
        <div className="wide feed">
          {error ? (
            <ErrorNotice message={error} retry={reload} />
          ) : loading ? (
            <Loading label="Loading shared contributions…" />
          ) : data?.posts.length ? (
            data.posts.map((post) => (
              <CommunityCard key={post.id} post={post} />
            ))
          ) : (
            <Empty title="The first story could be yours">
              <p className="muted">
                Supported contributions appear here when their authors choose to
                share.
              </p>
              <Link className="btn" href="/">
                Find a challenge <ArrowRight size={18} />
              </Link>
            </Empty>
          )}
        </div>
        <aside className="rail panel field-notes">
          <h3>A community of small actions</h3>
          <section>
            <strong>Shared by choice</strong>
            <p className="muted">
              Only supported contributions with explicit sharing consent appear
              here.
            </p>
          </section>
          <section>
            <strong>Participation, thoughtfully documented</strong>
            <p className="muted">
              {config?.simulatedAssessment
                ? "Assessments are currently simulated. "
                : ""}
              These posts do not claim independent verification.
            </p>
          </section>
          <section>
            <strong>Keep it kind and safe</strong>
            <p className="muted">
              Report private information or inappropriate content to the
              organizer.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
function CommunityCard({ post }: { post: Post }) {
  const { member } = useSession();
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <article className="post">
      <div className="post-header">
        <span className="avatar">{post.author.slice(0, 2).toUpperCase()}</span>
        <div className="post-author">
          <strong>{post.author}</strong>
          <span className="small muted">{date(post.createdAt)}</span>
        </div>
        <span className="badge">{post.category}</span>
      </div>
      <div className="post-copy stack">
        <Link href={"/challenges/" + post.challengeId}>
          <h2>{post.title}</h2>
        </Link>
        <p>{post.description}</p>
      </div>
      <img
        src={"/api/media/" + post.resultUploadId}
        className="post-image"
        alt={"Result photo for " + post.title}
      />
      <div className="post-footer">
        <span className="status">
          <Leaf size={18} />
          Supported{" "}
          {post.simulated ? "· Simulated assessment" : "· Evidence assessment"}
        </span>
        {member && (
          <button onClick={() => setReporting(!reporting)}>
            <Flag size={16} />
            Report
          </button>
        )}
      </div>
      {reporting && (
        <form
          className="panel"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await send("reports", {
                targetType: "contribution",
                targetId: post.id,
                reason,
              });
              setMessage(
                "Your report has been saved for administrator review.",
              );
              setReporting(false);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field name={"report-" + post.id} label="Reason for report">
            <textarea
              id={"report-" + post.id}
              required
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          {error && <ErrorNotice message={error} />}
          <button disabled={busy} className="btn">
            {busy ? "Saving report…" : "Submit report"}
          </button>
        </form>
      )}
      {message && (
        <p className="feedback-note" role="status">
          {message}
        </p>
      )}
    </article>
  );
}
export function ProgressPage() {
  return (
    <MemberGate>
      <Journal />
    </MemberGate>
  );
}
function Journal() {
  const { member } = useSession();
  const { data, error, loading, reload } = useResource<Progress>("progress");
  if (error) return <ErrorNotice message={error} retry={reload} />;
  if (loading || !data) return <Loading label="Opening your field journal…" />;
  return (
    <>
      <Heading
        title="Your actions, growing"
        subtitle="A personal record of the steps you have taken."
      />
      <section className="panel">
        <div className="progress-profile">
          <span className="avatar">
            {member?.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <h2>{member?.name}</h2>
            <p className="muted">Your environmental field journal</p>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <strong>{data.points}</strong>
            <span className="muted">Participation points</span>
          </div>
          <div className="stat">
            <strong>{data.supported}</strong>
            <span className="muted">Supported contributions</span>
          </div>
          <div className="stat">
            <strong>{data.categories.length}</strong>
            <span className="muted">Categories explored</span>
          </div>
        </div>
        <p className="helper">
          Points come from {data.rewardCount} stored awards. Sharing withdrawal
          leaves recognition intact. Deleted contributions may retain their
          original award in the ledger.
        </p>
      </section>
      <div className="section-heading">
        <div>
          <h2>Your submission history</h2>
          <p className="muted">
            Saved evidence, feedback, and your next steps.
          </p>
        </div>
        <Link href="/" className="btn secondary">
          Find an action
        </Link>
      </div>
      {data.history.length ? (
        <div className="stack">
          {data.history.map((item) => (
            <Link
              className="history-card"
              key={item.contribution.id}
              href={"/assessment/" + item.contribution.id}
            >
              <div className="row between">
                <h3>{item.challenge.title}</h3>
                <Outcome outcome={item.contribution.outcome} />
              </div>
              <p className="muted">{item.evidence.description}</p>
              <div className="row between">
                <span className="small muted">
                  {item.challenge.category} · Version {item.evidence.version} ·{" "}
                  {date(item.evidence.acceptedAt)}
                </span>
                <strong>
                  {item.points
                    ? "+" + item.points + " points"
                    : item.job.state === "failed"
                      ? "Assessment retry available"
                      : item.job.state === "processing"
                        ? "Assessment processing"
                        : "View assessment"}{" "}
                  <ArrowRight size={16} style={{ display: "inline" }} />
                </strong>
              </div>
              <p className="helper">
                {item.contribution.consent &&
                item.contribution.outcome === "supported"
                  ? "Shared with community"
                  : "Private contribution"}{" "}
                {item.assessment?.simulated ? "· Simulated assessment" : ""}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <Empty title="Every journal starts with one action">
          <p className="muted">
            Choose a challenge, document what you do, and your story will appear
            here.
          </p>
          <Link href="/" className="btn">
            Discover challenges
          </Link>
        </Empty>
      )}
    </>
  );
}
export function SignIn() {
  const { member, config, refresh } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const returnValue = params.get("returnTo") || "/progress";
  const returnTo =
    returnValue.startsWith("/") &&
    !returnValue.startsWith("//") &&
    !returnValue.includes("\\")
      ? returnValue
      : "/progress";
  const [name, setName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function google() {
    setBusy(true);
    setError("");
    try {
      const { initializeApp, getApps } = await import("firebase/app");
      const {
        getAuth,
        GoogleAuthProvider,
        signInWithPopup,
        signOut,
        setPersistence,
        inMemoryPersistence,
      } = await import("firebase/auth");
      const app =
        getApps()[0] ||
        initializeApp({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
      const auth = getAuth(app);
      await setPersistence(auth, inMemoryPersistence);
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const token = await credential.user.getIdToken();
      await send("session", { idToken: token });
      await signOut(auth);
      await refresh();
      router.push(returnTo);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Google sign-in is unavailable. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function demo(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await send("session", { name, accessCode });
      await refresh();
      router.push(returnTo);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="sign-in">
      <section className="welcome">
        <span className="eyebrow" style={{ color: "var(--color-accent)" }}>
          Welcome to Zyvara
        </span>
        <h2>
          Small actions.
          <br />A story that grows.
        </h2>
        <p>
          Find your next challenge. Document your effort.
          <br />
          Build a habit worth keeping.
        </p>
        <Sprout />
      </section>
      <div className="form">
        <Heading
          title={
            member ? "You are signed in" : "A greener everyday starts here"
          }
          subtitle={
            member
              ? member.name
              : "Save your progress and make your next action count."
          }
        />
        {error && <ErrorNotice message={error} />}{" "}
        {member ? (
          <Link className="btn" href={returnTo}>
            Continue <ArrowRight size={18} />
          </Link>
        ) : config?.demo ? (
          <form className="stack" onSubmit={demo}>
            <div className="auth-message">
              <strong>Restricted development demo</strong>
              <p>
                Use the organizer’s access code. Names identify demo profiles;
                this is not Google authentication. Never use real personal data
                in this mode.
              </p>
            </div>
            <Field
              name="name"
              label="Demo profile name"
              help="Use the same name to restore your demo records."
            >
              <input
                id="name"
                required
                maxLength={80}
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-describedby="name-help"
              />
            </Field>
            <Field name="accessCode" label="Demo access code">
              <input
                id="accessCode"
                type="password"
                required
                autoComplete="off"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
              />
            </Field>
            <button className="btn full" disabled={busy}>
              {busy ? "Signing in…" : "Enter restricted demo"}
            </button>
          </form>
        ) : (
          <>
            <button
              className="btn full secondary"
              disabled={busy || !config?.firebaseConfigured}
              onClick={() => void google()}
            >
              {busy ? "Opening Google…" : "Continue with Google"}
            </button>
            {config && !config.firebaseConfigured && (
              <p className="auth-message">
                Google authentication is waiting for fresh Firebase project
                configuration.
              </p>
            )}
          </>
        )}
        <p className="helper">
          <Shield size={16} style={{ display: "inline" }} /> Your evidence is
          private by default. You control sharing.
        </p>
        <Link className="small muted" href="/privacy">
          Read our privacy & participation notes
        </Link>
      </div>
    </div>
  );
}
export function Privacy() {
  const { config } = useSession();
  return (
    <article className="stack legal">
      <Heading
        title="Your actions. Your choice."
        subtitle="Privacy and participation in Zyvara"
      />
      <h2>What we store</h2>
      <p>
        We store your display name, challenges you create, submitted photos and
        descriptions, assessment jobs and outcomes, sharing choices, reports,
        and recognition ledger. Google sign-in identity is verified on the
        server. Email addresses are not displayed in the community.
      </p>
      <h2>Private by default</h2>
      <p>
        Evidence originals remain in private storage. The application serves
        sanitized WebP copies after an access check. Public sharing requires
        your consent and a supported result. Shared posts include your display
        name, selected photos, description, challenge, and assessment status.
        You can withdraw sharing from the assessment page at any time.
      </p>
      <h2>Photo assessments</h2>
      <p>
        {config?.simulatedAssessment === false
          ? "For assessment, Zyvara sends sanitized copies of your submitted photos, your description, and challenge requirements to Google Gemini. Your Google identity and private storage links are not included. Sharing with the community remains a separate choice."
          : "The current provider returns controlled test results and does not analyze photos. No photos are sent to Gemini in simulation mode."}{" "}
        Photo evidence cannot establish who performed an activity, when it
        happened, or measured environmental impact. Recognition celebrates
        documented participation.
      </p>
      <h2>Deletion and recognition</h2>
      <p>
        Deleting a contribution removes its description and photos and stops
        sharing immediately. Minimal evidence references, assessment records,
        and the reward ledger remain for integrity and audit; an award cannot be
        earned twice for the same challenge. Original upload slots that are
        never submitted need organizer cleanup.
      </p>
      <h2>Demo data</h2>
      <p>
        The restricted development demo uses organizer-issued access and named
        demonstration profiles. Anyone with the demo code and the same profile
        name can access that profile. Use test information only. Production uses
        Firebase Google identity.
      </p>
      <h2>Community safety</h2>
      <p>
        Use your own photos, avoid identifiable people and private information,
        and act safely with permission. Signed-in members can report public
        contributions. Configured administrators can hide reported content.
        Contact your event organizer about reports, retained records, or account
        deletion. Public pilot access should wait until organizer contact and
        retention procedures are configured.
      </p>
    </article>
  );
}
