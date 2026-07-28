-- Initial DB setup — runs once when PostgreSQL container first starts.
-- Creates extensions required by LectureCraft.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "unaccent";      -- accent-insensitive search
