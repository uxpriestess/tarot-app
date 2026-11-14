-- Records the verified fix already applied manually in production: default profile creation timestamps.
ALTER TABLE public.profiles ALTER COLUMN created_at SET DEFAULT now();
