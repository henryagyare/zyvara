"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react";
import {
  Leaf,
  Users,
  ChartNoAxesColumnIncreasing,
  Plus,
  LogOut,
} from "lucide-react";
import { api, type Member, type Config } from "./api";
import { Logo } from "./art";
import { Discover, Details, Create } from "./challenges";
import { Evidence, AssessmentPage } from "./evidence";
import { Community, ProgressPage, SignIn, Privacy } from "./member";
import { Heading, ErrorNotice } from "./shared";
type Session = {
  member: Member | null;
  config: Config | null;
  ready: boolean;
  refresh: () => Promise<void>;
};
const SessionContext = createContext<Session>({
  member: null,
  config: null,
  ready: false,
  refresh: async () => {},
});
export const useSession = () => useContext(SessionContext);
export function ZyvaraApp() {
  const path = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const [session, configuration] = await Promise.all([
        api<{ member: Member | null }>("session"),
        api<Config>("config"),
      ]);
      setMember(session.member);
      setConfig(configuration);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to restore session.");
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);
  const active = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);
  const nav = [
    { href: "/", label: "Discover", Icon: Leaf },
    { href: "/community", label: "Community", Icon: Users },
    {
      href: "/progress",
      label: "My progress",
      Icon: ChartNoAxesColumnIncreasing,
    },
  ];
  const segments = path.split("/").filter(Boolean);
  let content;
  if (!segments.length) content = <Discover />;
  else if (segments[0] === "challenges" && segments.length === 2)
    content = <Details id={segments[1]} />;
  else if (segments[0] === "create") content = <Create />;
  else if (segments[0] === "evidence" && segments[1])
    content = (
      <Evidence challengeId={segments[1]} revision={params.get("revision")} />
    );
  else if (segments[0] === "assessment" && segments[1])
    content = <AssessmentPage id={segments[1]} />;
  else if (segments[0] === "community") content = <Community />;
  else if (segments[0] === "progress") content = <ProgressPage />;
  else if (segments[0] === "signin") content = <SignIn />;
  else if (segments[0] === "privacy") content = <Privacy />;
  else
    content = (
      <>
        <Heading title="This page is unavailable" />
        <Link href="/" className="btn">
          Back to Discover
        </Link>
      </>
    );
  return (
    <SessionContext.Provider value={{ member, config, ready, refresh }}>
      <div className="product">
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <header className="app-nav">
          <Link className="brand" href="/" aria-label="Zyvara home">
            <Logo />
            <span>zyvara</span>
          </Link>
          <nav className="nav-links" aria-label="Main navigation">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            <Link className="btn secondary create-link" href="/create">
              <Plus size={18} aria-hidden="true" />
              Create challenge
            </Link>
            {member ? (
              <>
                <Link
                  className="avatar"
                  href="/progress"
                  aria-label={member.name + " — my progress"}
                >
                  {member.name.slice(0, 2).toUpperCase()}
                </Link>
                <button
                  className="icon-button"
                  aria-label="Sign out"
                  onClick={async () => {
                    try {
                      await api("session", { method: "DELETE" });
                      await refresh();
                      router.push("/");
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <Link
                className="btn"
                href={"/signin?returnTo=" + encodeURIComponent(path)}
              >
                Sign in
              </Link>
            )}
          </div>
        </header>
        {config?.demo && (
          <div className="mode-note">
            Restricted development demo · Persistent local records · Assessments
            are simulated
          </div>
        )}
        <main className="main" id="main" tabIndex={-1}>
          {error && (
            <ErrorNotice message={error} retry={() => void refresh()} />
          )}{" "}
          {content}
        </main>
        <footer className="footer">
          <span>Small actions. Lasting habits.</span>
          <Link href="/privacy">Privacy & participation</Link>
          <span>zyvara.us</span>
        </footer>
        <nav className="bottom-nav" aria-label="Mobile navigation">
          {[...nav, { href: "/create", label: "Create", Icon: Plus }].map(
            (item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active(item.href) ? "page" : undefined}
              >
                <item.Icon size={22} aria-hidden="true" />
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </SessionContext.Provider>
  );
}
export function MemberGate({ children }: { children: React.ReactNode }) {
  const { member, ready } = useSession();
  const path = usePathname();
  if (!ready) return <p role="status">Restoring your session…</p>;
  if (!member)
    return (
      <>
        <Heading
          title="Your next action starts here"
          subtitle="Sign in to save your evidence and keep a personal record of participation."
        />
        <Link
          className="btn"
          href={"/signin?returnTo=" + encodeURIComponent(path)}
        >
          Sign in to continue
        </Link>
      </>
    );
  return children;
}
