-- Safety migration to ensure legacy enums exist in environments that missed earlier migrations.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Tier') THEN
    CREATE TYPE "Tier" AS ENUM ('TIER1', 'TIER2', 'TIER3', 'TIER4');
  END IF;
END
$$;
