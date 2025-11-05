DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = '"ActivityAction"'::regtype AND enumlabel = 'SUPPORT') THEN
    ALTER TYPE "ActivityAction" ADD VALUE 'SUPPORT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = '"ActivityAction"'::regtype AND enumlabel = 'CHALLENGE') THEN
    ALTER TYPE "ActivityAction" ADD VALUE 'CHALLENGE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = '"ActivityAction"'::regtype AND enumlabel = 'CONTRADICT') THEN
    ALTER TYPE "ActivityAction" ADD VALUE 'CONTRADICT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = '"ActivityAction"'::regtype AND enumlabel = 'CITE') THEN
    ALTER TYPE "ActivityAction" ADD VALUE 'CITE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = '"ActivityAction"'::regtype AND enumlabel = 'REPLICATE') THEN
    ALTER TYPE "ActivityAction" ADD VALUE 'REPLICATE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = '"ActivityAction"'::regtype AND enumlabel = 'ENDORSE') THEN
    ALTER TYPE "ActivityAction" ADD VALUE 'ENDORSE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = '"ActivityAction"'::regtype AND enumlabel = 'FOLLOW') THEN
    ALTER TYPE "ActivityAction" ADD VALUE 'FOLLOW';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = '"ActivityAction"'::regtype AND enumlabel = 'FORK') THEN
    ALTER TYPE "ActivityAction" ADD VALUE 'FORK';
  END IF;
END
$$;
