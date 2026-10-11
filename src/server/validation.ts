import { z } from "zod";
export const categories = [
  "Cleanup",
  "Planting",
  "Recycling",
  "Conservation",
] as const;
const narrative = z
  .string()
  .trim()
  .min(1, "This field is required.")
  .max(2000, "Use at most 2,000 characters.");
export const challengeInput = z.object({
  title: z.string().trim().min(1).max(80),
  description: narrative,
  category: z.enum(categories),
  requirements: z
    .array(z.string().trim().min(1).max(500))
    .min(1)
    .max(20)
    .refine(
      (v) => v.join("\n").length <= 2000,
      "Requirements must be at most 2,000 characters.",
    ),
  deadline: z.iso.datetime({ offset: true }).nullable().optional(),
});
export const contributionInput = z.object({
  challengeId: z.string().min(1),
  description: narrative,
  resultUploadId: z.string().uuid(),
  beforeUploadId: z.string().uuid().nullable().optional(),
  consent: z.boolean().default(false),
  scenario: z
    .enum([
      "supported",
      "needs_more_evidence",
      "not_supported",
      "failure",
      "failure_once",
    ])
    .optional(),
});
