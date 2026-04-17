-- Migration to Support Google OAuth

-- 1. Drop the NOT NULL constraint on password_hash to allow OAuth users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Add auth_provider tracking
ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'local';

-- 3. Add oauth_id for future proof provider tracking
ALTER TABLE users ADD COLUMN oauth_id TEXT UNIQUE;

-- 4. Enable RLS on the new columns if necessary (should already be covered if users table is protected)
