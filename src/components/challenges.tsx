"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search, ArrowRight, Check, Clock } from "lucide-react";
import { type Challenge, send } from "./api";
import { Sprout, CategoryArt } from "./art";
import {
  Heading,
  ErrorNotice,
  Loading,
  Empty,
  Field,
  formError,
  ConfirmDialog,
  date,
  useResource,
} from "./shared";
import { CreatorReview } from "./review";
import { MemberGate, useSession } from "./app";
const categories = ["Cleanup", "Planting", "Recycling", "Conservation"];
export function Discover() {
  const { config } = useSession();
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const { data, error, loading, reload } = useResource<{
    challenges: Challenge[];
  }>(
    "challenges?" +
      new URLSearchParams({
        ...(category ? { category } : {}),
        ...(query ? { q: query } : {}),
      }),
  );
  return (
    <>
      <section className="feature">
        <div className="feature-copy">
          <span className="eyebrow">A little action goes a long way</span>
          <h1>
            Small actions.
            <br />
            Lasting habits.
          </h1>
          <p>
            Find your next environmental challenge.
            <br />
            Make a difference, one thoughtful step at a time.
          </p>
          <a className="btn accent" href="#challenges">
            Find your next action <ArrowRight size={18} />
          </a>
        </div>
        <Sprout />
      </section>
      <section className="stack" id="challenges">
        <div className="section-heading">
          <div>
            <h2>Find your next action</h2>
            <p className="muted">
              Practical challenges for a greener everyday.
            </p>
          </div>
          <span className="small muted">
            {data ? data.challenges.length + " challenges" : ""}
          </span>
        </div>
        <div
          className="filter-bar"
          role="group"
          aria-label="Filter challenges by category"
        >
          {["All actions", ...categories].map((c) => (
            <button
              key={c}
              className={
                "filter " +
                ((c === "All actions" ? !category : category === c)
                  ? "active"
                  : "")
              }
              aria-pressed={c === "All actions" ? !category : category === c}
              onClick={() => setCategory(c === "All actions" ? "" : c)}
            >
              {c}
            </button>
          ))}
          <label className="search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search challenges</span>
            <input
              placeholder="Search challenges"
              value={query}
              maxLength={80}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        {error ? (
          <ErrorNotice message={error} retry={reload} />
        ) : loading ? (
          <Loading label="Finding challenges…" />
        ) : data?.challenges.length ? (
          <div className="cards">
            {data.challenges.map((c) => (
              <ChallengeCard key={c.id} challenge={c} />
            ))}
          </div>
        ) : (
          <Empty title="No challenges found">
            <p className="muted">Try another category or a shorter search.</p>
            <button
              className="btn secondary"
              onClick={() => {
                setCategory("");
                setQuery("");
              }}
            >
              Reset filters
            </button>
          </Empty>
        )}
      </section>
      <div className="feedback-note">
        Recognition celebrates documented participation.{" "}
        {config?.simulatedAssessment
          ? "Photo assessments are currently simulated. "
          : ""}
        Photos do not independently verify an activity.
      </div>
    </>
  );
}
function ChallengeCard({ challenge: c }: { challenge: Challenge }) {
  const closed =
    c.status === "closed" ||
    (!!c.deadline && new Date(c.deadline) < new Date());
  return (
    <Link className="challenge-card" href={"/challenges/" + c.id}>
      <div className={"category-art " + c.category.toLowerCase()}>
        <CategoryArt category={c.category} />
      </div>
      <div className="card-info">
        <span className="category">{c.category}</span>
        <h2>{c.title}</h2>
        <p className="muted">{c.description}</p>
        <div className="card-meta">
          <span>By {c.creator}</span>
          <span>·</span>
          <span>
            {closed
              ? "Closed"
              : c.deadline
                ? "Due " + new Date(c.deadline).toLocaleDateString()
                : "Open challenge"}
          </span>
        </div>
        <div className="card-footer">
          <b>50 points once supported</b>
          <ArrowRight size={18} aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}
export function Details({ id }: { id: string }) {
  const { member, config } = useSession();
  const {
    data: c,
    error,
    loading,
    reload,
  } = useResource<Challenge>("challenges/" + id);
  if (error)
    return (
      <>
        <Heading title="Challenge unavailable" />
        <ErrorNotice message={error} retry={reload} />
        <Link href="/" className="btn secondary">
          Back to Discover
        </Link>
      </>
    );
  if (loading || !c) return <Loading label="Opening challenge…" />;
  const closed =
    c.status === "closed" ||
    (!!c.deadline && new Date(c.deadline) < new Date());
  return (
    <>
      <Heading
        title={c.title}
        subtitle={c.description}
        crumb={<Link href="/">Discover / {c.category}</Link>}
      />
      <div className="columns">
        <div className="wide stack">
          <div className="mission-art">
            <CategoryArt category={c.category} />
            <h2>
              One thoughtful action.
              <br />A greener everyday.
            </h2>
          </div>
          <section className="panel">
            <h2>Your mission</h2>
            <p>{c.description}</p>
            <h3>What your evidence should show</h3>
            {c.requirements.map((r, i) => (
              <div className="mission-step" key={i}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <p>{r}</p>
              </div>
            ))}
          </section>
          {member?.id === c.creatorId && <CreatorReview challengeId={id} />}
          <div className="feedback-note">
            Choose a safe, permitted location. Avoid identifiable people,
            private information, and hazardous materials in your photos.
          </div>
        </div>
        <aside className="rail stack">
          <section className="panel">
            <span className="eyebrow">Recognition for participation</span>
            <div className="reward">
              50 <span className="small">points</span>
            </div>
            <p className="muted">
              Earned once when your contribution receives a supported
              assessment.
            </p>
            <div className="divider" />
            <div className="metric-row">
              <span>Category</span>
              <b>{c.category}</b>
            </div>
            <div className="metric-row">
              <span>Created by</span>
              <b>{c.creator}</b>
            </div>
            <div className="metric-row">
              <span>Participants</span>
              <b>{c.participants}</b>
            </div>
            <p className="date-note">
              <Clock size={16} style={{ display: "inline" }} />{" "}
              {c.deadline ? "Deadline: " + date(c.deadline) : "No deadline"}
            </p>
            {member?.id === c.creatorId ? (
              <div className="feedback-note">
                You created this challenge. Review submissions below; creators
                cannot participate in their own challenges.
              </div>
            ) : closed ? (
              <div className="status warning">Closed for submissions</div>
            ) : (
              <Link className="btn full" href={"/evidence/" + id}>
                Take this challenge <ArrowRight size={18} />
              </Link>
            )}
          </section>
          <section className="panel field-notes">
            <h3>Field notes</h3>
            <p className="small muted">
              A result photo and description are required. A before photo is
              optional. Sharing is your choice and starts off.
            </p>
            <p className="small muted">
              {config?.simulatedAssessment === false
                ? "Submitted photos and descriptions are assessed by Google Gemini. See Privacy & participation for details."
                : "The current assessment provider is a labeled simulation."}
            </p>
          </section>
          {member?.id === c.creatorId && !closed && (
            <ConfirmDialog
              title="Close this challenge?"
              description="New submissions will stop. Existing accepted evidence and recognition will remain."
              confirm="Close challenge"
              trigger="Close challenge"
              danger
              onConfirm={async () => {
                await send("challenges/" + id + "/close", {});
                reload();
              }}
            />
          )}
        </aside>
      </div>
    </>
  );
}
export function Create() {
  return (
    <MemberGate>
      <CreateForm />
    </MemberGate>
  );
}
function CreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Cleanup");
  const [requirements, setRequirements] = useState("");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setFields({});
    try {
      const created = await send<Challenge>("challenges", {
        title,
        description,
        category,
        requirements: requirements
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean),
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
      router.push("/challenges/" + created.id);
    } catch (e) {
      setError(formError(e, setFields));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        title="Create a little momentum"
        subtitle="Turn a practical idea into an environmental challenge."
        crumb={<Link href="/">Discover / Create challenge</Link>}
      />
      <div className="columns">
        <form className="panel wide" onSubmit={submit}>
          {error && <ErrorNotice message={error} />}
          <Field
            name="title"
            label="Challenge title"
            help="Keep it clear and actionable. Maximum 80 characters."
            error={fields.title}
          >
            <input
              id="title"
              required
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-describedby="title-help"
              aria-invalid={!!fields.title}
            />
          </Field>
          <Field
            name="description"
            label="Describe the mission"
            help="What should someone do? Include safety and permission guidance."
            error={fields.description}
          >
            <textarea
              id="description"
              required
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-describedby="description-help description-count"
              aria-invalid={!!fields.description}
            />
          </Field>
          <p id="description-count" className="helper">
            {description.length} / 2,000 characters
          </p>
          <div className="form-two">
            <Field name="category" label="Category" error={fields.category}>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field
              name="deadline"
              label="Deadline (optional)"
              help="Shown in your local timezone."
              error={fields.deadline}
            >
              <input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                aria-describedby="deadline-help"
                aria-invalid={!!fields.deadline}
              />
            </Field>
          </div>
          {deadline && (
            <p className="date-note">
              Closes {new Date(deadline).toLocaleString()} (
              {Intl.DateTimeFormat().resolvedOptions().timeZone}).
            </p>
          )}
          <Field
            name="requirements"
            label="Evidence requirements"
            help="One requirement per line. Maximum 2,000 characters in total."
            error={fields.requirements}
          >
            <textarea
              id="requirements"
              required
              maxLength={2000}
              placeholder="Show the result of the action.&#10;Describe how you completed it safely."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              aria-describedby="requirements-help"
              aria-invalid={!!fields.requirements}
            />
          </Field>
          <div className="form-actions">
            <Link href="/" className="btn secondary">
              Cancel
            </Link>
            <button className="btn" disabled={busy}>
              {busy ? "Publishing…" : "Publish challenge"}
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
        <aside className="panel field-notes rail">
          <h3>A thoughtful challenge</h3>
          <section>
            <strong>Make it achievable</strong>
            <p className="muted">
              A specific, small action makes it easier to get started.
            </p>
          </section>
          <section>
            <strong>Say what to document</strong>
            <p className="muted">
              Explain exactly what a result photo and description should
              include.
            </p>
          </section>
          <section>
            <strong>Recognition is consistent</strong>
            <p className="muted">
              50 points once per member per supported challenge contribution.
            </p>
          </section>
          <section>
            <Check size={20} />
            <p className="muted">
              You choose the category and requirements. AI does not create this
              challenge.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
