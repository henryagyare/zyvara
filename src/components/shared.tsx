"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, AlertTriangle, X, Clock } from "lucide-react";
import { api, ApiError } from "./api";
export function useResource<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    if (!url) return;
    api<T>(url)
      .then((value) => {
        if (active) {
          setData(value);
          setLoadedUrl(url);
          setError("");
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoadedUrl(url);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [url, revision]);
  const reload = useCallback(() => {
    setLoading(true);
    setRevision((r) => r + 1);
  }, []);
  return {
    data: loadedUrl === url ? data : null,
    error: loadedUrl === url ? error : "",
    loading: loading || loadedUrl !== url,
    reload,
    setData,
  };
}
export function Heading({
  title,
  subtitle,
  crumb,
}: {
  title: string;
  subtitle?: string;
  crumb?: ReactNode;
}) {
  return (
    <header className="page-heading">
      {crumb && <div className="breadcrumb">{crumb}</div>}
      <h1>{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
    </header>
  );
}
export function ErrorNotice({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="error-banner" role="alert">
      <strong>{message}</strong>
      {retry && (
        <button className="btn secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="panel" role="status">
      <div className="row">
        <span className="loading-dot" />
        <p>{label}</p>
      </div>
      <div className="skeleton big" />
      <div className="skeleton" />
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export const outcomeLabel = (outcome: string | null) =>
  outcome === "supported"
    ? "Supported"
    : outcome === "needs_more_evidence"
      ? "Needs more evidence"
      : outcome === "not_supported"
        ? "Not supported"
        : "Assessment pending";
export function Outcome({ outcome }: { outcome: string | null }) {
  const Icon =
    outcome === "supported"
      ? Check
      : outcome === "needs_more_evidence"
        ? AlertTriangle
        : outcome === "not_supported"
          ? X
          : Clock;
  return (
    <span
      className={
        "status " +
        (outcome === "needs_more_evidence"
          ? "warning"
          : outcome === "not_supported"
            ? "error"
            : outcome
              ? ""
              : "info")
      }
    >
      <Icon size={18} aria-hidden="true" />
      {outcomeLabel(outcome)}
    </span>
  );
}
export function Field({
  name,
  label,
  help,
  error,
  children,
}: {
  name: string;
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={"field " + (error ? "invalid" : "")}>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      {children}
      <span className="helper" id={name + "-help"}>
        {error || help}
      </span>
    </div>
  );
}
export function formError(
  error: unknown,
  setFields: (fields: Record<string, string>) => void,
) {
  if (error instanceof ApiError) {
    setFields(error.fields);
    requestAnimationFrame(() => {
      const first = Object.keys(error.fields)[0];
      document.getElementById(first)?.focus();
    });
  }
  return error instanceof Error ? error.message : "Please try again.";
}
export function ConfirmDialog({
  title,
  description,
  confirm,
  onConfirm,
  trigger,
  danger = false,
}: {
  title: string;
  description: string;
  confirm: string;
  onConfirm: () => Promise<void>;
  trigger: string;
  danger?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        className={"btn " + (danger ? "danger" : "secondary")}
        ref={buttonRef}
        onClick={() => {
          setError("");
          ref.current?.showModal();
        }}
      >
        {trigger}
      </button>
      <dialog
        className="dialog-native"
        ref={ref}
        aria-labelledby={title.replaceAll(" ", "-")}
        onClose={() => buttonRef.current?.focus()}
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <div className="dialog">
          <h2 id={title.replaceAll(" ", "-")}>{title}</h2>
          <p>{description}</p>
          {error && <ErrorNotice message={error} />}
          <div className="dialog-actions">
            <button
              className="btn secondary"
              autoFocus
              disabled={busy}
              onClick={() => ref.current?.close()}
            >
              Cancel
            </button>
            <button
              className={"btn " + (danger ? "danger" : "")}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  ref.current?.close();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Please try again.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saving…" : confirm}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
export function date(value: string | null) {
  return value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "No deadline";
}
