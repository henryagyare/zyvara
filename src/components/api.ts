export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
export async function api<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api/" + url, {
    ...options,
    headers: {
      ...(options.body && typeof options.body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok)
    throw new ApiError(
      body.error || "Something went wrong. Please try again.",
      response.status,
      body.fields,
    );
  return body;
}
export const send = <T>(url: string, body: unknown, method = "POST") =>
  api<T>(url, { method, body: JSON.stringify(body) });
export type Member = { id: string; name: string; admin: boolean };
export type Config = {
  demo: boolean;
  scenarioSelection: boolean;
  firebaseConfigured: boolean;
  simulatedAssessment: boolean;
  database: string;
  storage: string;
  productionReady: boolean;
};
export type Challenge = {
  id: string;
  title: string;
  description: string;
  category: string;
  creator: string;
  creatorId?: string;
  deadline: string | null;
  status: string;
  requirements: string[];
  participants: number;
  hidden?: boolean;
};
export type Assessment = {
  outcome: "supported" | "needs_more_evidence" | "not_supported";
  observations: string[];
  requirements: { requirement: string; status: string; explanation: string }[];
  feedback: string;
  nextStep: string;
  provider: string;
  simulated: boolean;
};
export type ContributionDetail = {
  contribution: {
    id: string;
    latestVersion: number;
    outcome: string | null;
    consent: boolean;
    hidden: boolean;
  };
  evidence: {
    id: string;
    version: number;
    description: string;
    resultUploadId: string;
    beforeUploadId: string | null;
    acceptedAt: string;
    requirements: string[];
  };
  job: {
    id: string;
    state: string;
    error: string | null;
    attempts: number;
    retryAt: string | null;
    leaseUntil: string | null;
  };
  assessment: Assessment | null;
  points: number;
  challenge: Challenge;
};
export type Progress = {
  points: number;
  supported: number;
  categories: string[];
  history: ContributionDetail[];
  rewardCount: number;
};
export type Post = {
  id: string;
  title: string;
  challengeId: string;
  author: string;
  description: string;
  category: string;
  resultUploadId: string;
  beforeUploadId: string | null;
  createdAt: string;
  simulated: boolean;
};
