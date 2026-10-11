import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type { AssessmentResult } from "./assessment";
const time = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });
export const mediaObjects = pgTable("media_objects", {
  key: text("key").primaryKey(),
  encoded: text("encoded").notNull(),
  bytes: integer("bytes").notNull(),
  mime: text("mime").notNull(),
  createdAt: time("created_at").notNull().defaultNow(),
});
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  subject: text("subject").notNull().unique(),
  name: text("name").notNull(),
  admin: boolean("admin").notNull().default(false),
  createdAt: time("created_at").notNull().defaultNow(),
});
export const challenges = pgTable("challenges", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  requirements: jsonb("requirements").$type<string[]>().notNull(),
  deadline: time("deadline"),
  status: text("status").notNull().default("published"),
  hidden: boolean("hidden").notNull().default(false),
  createdAt: time("created_at").notNull().defaultNow(),
});
export const contributions = pgTable(
  "contributions",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    challengeId: text("challenge_id")
      .notNull()
      .references(() => challenges.id),
    latestVersion: integer("latest_version").notNull().default(0),
    outcome: text("outcome"),
    consent: boolean("consent").notNull().default(false),
    consentAt: time("consent_at"),
    hidden: boolean("hidden").notNull().default(false),
    deletedAt: time("deleted_at"),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("one_contribution_per_member_challenge").on(
      t.ownerId,
      t.challengeId,
    ),
  ],
);
export const uploads = pgTable("uploads", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  role: text("role").notNull(),
  objectKey: text("object_key").notNull().unique(),
  derivativeKey: text("derivative_key"),
  mime: text("mime"),
  bytes: integer("bytes"),
  checksum: text("checksum"),
  state: text("state").notNull().default("allocated"),
  createdAt: time("created_at").notNull().defaultNow(),
});
export const evidence = pgTable(
  "evidence_versions",
  {
    id: text("id").primaryKey(),
    contributionId: text("contribution_id")
      .notNull()
      .references(() => contributions.id),
    version: integer("version").notNull(),
    description: text("description").notNull(),
    requirements: jsonb("requirements").$type<string[]>().notNull(),
    resultUploadId: text("result_upload_id")
      .notNull()
      .unique()
      .references(() => uploads.id),
    beforeUploadId: text("before_upload_id")
      .unique()
      .references(() => uploads.id),
    acceptedAt: time("accepted_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("immutable_evidence_version").on(t.contributionId, t.version),
  ],
);
export const jobs = pgTable("assessment_jobs", {
  id: text("id").primaryKey(),
  evidenceId: text("evidence_id")
    .notNull()
    .unique()
    .references(() => evidence.id),
  state: text("state").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  leaseUntil: time("lease_until"),
  requestId: text("request_id"),
  error: text("error"),
  retryAt: time("retry_at"),
  scenario: text("scenario").notNull(),
  createdAt: time("created_at").notNull().defaultNow(),
});
export const assessments = pgTable("assessments", {
  id: text("id").primaryKey(),
  evidenceId: text("evidence_id")
    .notNull()
    .references(() => evidence.id),
  requestId: text("request_id").notNull().unique(),
  result: jsonb("result").$type<AssessmentResult>().notNull(),
  createdAt: time("created_at").notNull().defaultNow(),
});
export const creatorReviews = pgTable("creator_reviews", {
  evidenceId: text("evidence_id")
    .primaryKey()
    .references(() => evidence.id),
  reviewerId: text("reviewer_id")
    .notNull()
    .references(() => users.id),
  decision: text("decision").notNull(),
  reason: text("reason").notNull(),
  createdAt: time("created_at").notNull().defaultNow(),
});
export const rewards = pgTable(
  "rewards",
  {
    id: text("id").primaryKey(),
    contributionId: text("contribution_id")
      .notNull()
      .unique()
      .references(() => contributions.id),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => assessments.id),
    amount: integer("amount").notNull().default(50),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [index("rewards_owner").on(t.ownerId)],
);
export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => users.id),
  targetId: text("target_id").notNull(),
  targetType: text("target_type").notNull(),
  reason: text("reason").notNull(),
  createdAt: time("created_at").notNull().defaultNow(),
});
export const adminActions = pgTable("admin_actions", {
  id: text("id").primaryKey(),
  adminId: text("admin_id")
    .notNull()
    .references(() => users.id),
  targetId: text("target_id").notNull(),
  targetType: text("target_type").notNull(),
  action: text("action").notNull(),
  createdAt: time("created_at").notNull().defaultNow(),
});
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: time("window_start").notNull(),
});
