-- Step 1: Enable extensions and create types
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types/enums
DO $$ BEGIN
    CREATE TYPE role AS ENUM ('admin', 'coordinator', 'teacher', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE blooms_level AS ENUM ('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE outcome_type AS ENUM ('ILO', 'PLO', 'CLO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE badge_type AS ENUM ('achievement', 'mastery', 'streak', 'special');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;