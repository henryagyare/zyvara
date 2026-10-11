import type { AssessmentProvider } from "./assessment";
import { validateProviderResult } from "./assessment";
import { createAnalyzer } from "./ai/analyzeSubmission";
import {
  createGeminiProvider,
  type AssessmentProvider as GeminiTransport,
} from "./ai/geminiClient";

// Imported from Gabbystarks7/zyvara_ai at 43e5e2485d840f7c7c8a85883e670d2ab99a00d2.
// Adapted for immutable requirements and Zyvara's 25-second job deadline.
export function createZyvaraGeminiProvider(
  transport?: GeminiTransport,
  options: { timeoutMs?: number; model?: string } = {},
): AssessmentProvider {
  return {
    id: "zyvara-gemini-requirements-v1",
    simulated: false,
    async assess(input) {
      if (!input.challenge)
        throw new Error("Saved challenge metadata is required for assessment.");
      const model = options.model || process.env.GEMINI_MODEL;
      if (!model)
        throw new Error("Set GEMINI_MODEL in the server environment.");
      // Retries are owned by the durable application job. One cancellable call per attempt.
      const analyze = createAnalyzer(transport || createGeminiProvider(), {
        timeoutMs: options.timeoutMs ?? 20_000,
        maxRetries: 0,
      });
      const result = await analyze({
        challengeId: input.challenge.id,
        challengeTitle: input.challenge.title,
        challengeDescription: input.challenge.description,
        challengeCategory: input.challenge.category,
        requirements: input.requirements,
        submissionDescription: input.description,
        afterImage: {
          mimeType: input.resultImage.mime,
          data: input.resultImage.bytes,
        },
        beforeImage: input.beforeImage
          ? { mimeType: input.beforeImage.mime, data: input.beforeImage.bytes }
          : undefined,
      });
      return validateProviderResult(
        {
          outcome:
            result.status === "insufficient_evidence"
              ? "needs_more_evidence"
              : result.status,
          observations: result.observations,
          requirements: result.requirements,
          feedback: result.feedback,
          nextStep: result.nextStep,
          provider: `${this.id}/${model}`,
          simulated: false,
        },
        input.requirements,
      );
    },
  };
}
export const geminiProvider = createZyvaraGeminiProvider();
