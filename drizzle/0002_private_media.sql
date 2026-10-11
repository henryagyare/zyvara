CREATE TABLE IF NOT EXISTS media_objects (
  key text PRIMARY KEY,
  encoded text NOT NULL,
  bytes integer NOT NULL CHECK (bytes > 0 AND bytes <= 1048576),
  mime text NOT NULL CHECK (mime = 'image/webp'),
  created_at timestamptz NOT NULL DEFAULT now()
);
