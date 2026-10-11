import { z } from "zod";
import { geminiProvider } from "./gemini-assessment";
export const resultSchema = z.object({
  outcome: z.enum(["supported", "needs_more_evidence", "not_supported"]),
  observations: z.array(z.string().min(1).max(1000)).min(1).max(20),
  requirements: z
    .array(
      z.object({
        requirement: z.string(),
        status: z.enum(["supported", "unclear", "not_supported"]),
        explanation: z.string().min(1),
      }),
    )
    .min(1),
  feedback: z.string().min(1).max(2000),
  nextStep: z.string().min(1).max(1000),
  provider: z.string(),
  simulated: z.boolean(),
});
export type AssessmentResult = z.infer<typeof resultSchema>;
export type StoredImage = {
  bytes: Buffer;
  mime: "image/webp";
  checksum: string;
};
export type AssessmentInput = {
  challenge?: {
    id: string;
    title: string;
    description: string;
    category: string;
  };
  requirements: string[];
  description: string;
  resultImage: StoredImage;
  beforeImage?: StoredImage;
  evidenceVersion: number;
  requestId: string;
};
export type Scenario =
  | "supported"
  | "needs_more_evidence"
  | "not_supported"
  | "failure"
  | "failure_once";
export interface AssessmentProvider {
  readonly id: string;
  readonly simulated: boolean;
  assess(
    input: AssessmentInput,
    context: { scenario: Scenario; attempt: number },
  ): Promise<AssessmentResult>;
}
export const scenarios: Scenario[] = [
  "supported",
  "needs_more_evidence",
  "not_supported",
  "failure",
  "failure_once",
];
export const mockProvider: AssessmentProvider = {
  id: "zyvara-deterministic-mock-v1",
  simulated: true,
  async assess(input, context) {
    if (
      context.scenario === "failure" ||
      (context.scenario === "failure_once" && context.attempt === 1)
    )
      throw new Error(
        "Simulated provider unavailable. Your evidence is saved; retry this assessment.",
      );
    const outcome =
      context.scenario === "failure_once" ? "supported" : context.scenario;
    return resultSchema.parse({
      outcome,
      observations: [
        "Simulation fixture: a stored, decoded result image was supplied. No photographic analysis was performed.",
        `Evidence version ${input.evidenceVersion}; ${input.beforeImage ? "an optional before image was supplied" : "no before image was supplied"}.`,
      ],
      requirements: input.requirements.map((requirement) => ({
        requirement,
        status:
          outcome === "supported"
            ? "supported"
            : outcome === "needs_more_evidence"
              ? "unclear"
              : "not_supported",
        explanation:
          "This requirement status comes from the controlled simulation scenario, not visual analysis.",
      })),
      feedback:
        outcome === "supported"
          ? "The simulated scenario supports this contribution. Recognition is issued once by the server."
          : outcome === "needs_more_evidence"
            ? "The simulated scenario requests clearer evidence. Review the requirements and submit a new result photo."
            : "The simulated scenario does not support the requirements. You can revise your evidence.",
      nextStep:
        outcome === "supported"
          ? "View your progress, or choose whether to share this contribution."
          : "Read each requirement, describe your action clearly, and submit revised evidence.",
      provider: this.id,
      simulated: true,
    });
  },
};
export function getAssessmentProvider(): AssessmentProvider {
  if (process.env.ASSESSMENT_PROVIDER === "gemini") return geminiProvider;
  if (
    process.env.ASSESSMENT_PROVIDER &&
    process.env.ASSESSMENT_PROVIDER !== "mock"
  )
    throw new Error("Unknown assessment provider. Select mock or gemini.");
  return mockProvider;
}
export function validateProviderResult(value: unknown, requirements: string[]) {
  const result = resultSchema.parse(value);
  if (
    result.requirements.length !== requirements.length ||
    result.requirements.some((r, i) => r.requirement !== requirements[i])
  )
    throw new Error("Provider returned mismatched requirements");
  if (
    result.outcome === "supported" &&
    result.requirements.some((r) => r.status !== "supported")
  )
    throw new Error("Inconsistent supported result");
  return result;
}
