CREATE TABLE IF NOT EXISTS creator_reviews (
 evidence_id text PRIMARY KEY REFERENCES evidence_versions(id),
 reviewer_id text NOT NULL REFERENCES users(id),
 decision text NOT NULL CHECK (decision IN ('approve', 'deny')),
 reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE rewards DROP CONSTRAINT IF EXISTS rewards_amount_check;
ALTER TABLE rewards ADD CONSTRAINT rewards_amount_check CHECK (amount IN (0, 50));
