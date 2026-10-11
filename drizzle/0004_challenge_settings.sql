ALTER TABLE challenges ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 50 CHECK (points BETWEEN 1 AND 1000);
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS font_family text NOT NULL DEFAULT 'default' CHECK (font_family IN ('default','sans','serif'));
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS font_size text NOT NULL DEFAULT 'default' CHECK (font_size IN ('small','default','large'));
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS reward_points integer NOT NULL DEFAULT 50 CHECK (reward_points BETWEEN 1 AND 1000);
ALTER TABLE rewards DROP CONSTRAINT IF EXISTS rewards_amount_check;
ALTER TABLE rewards ADD CONSTRAINT rewards_amount_check CHECK (amount BETWEEN 0 AND 1000);
