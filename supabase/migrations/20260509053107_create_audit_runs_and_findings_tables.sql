CREATE TABLE IF NOT EXISTS audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL UNIQUE,
  commit_sha text,
  migration_head text,
  env_id text NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('Go', 'Go-with-backlog', 'No-Go')),
  blocker_count integer NOT NULL DEFAULT 0,
  critical_count integer NOT NULL DEFAULT 0,
  major_count integer NOT NULL DEFAULT 0,
  minor_count integer NOT NULL DEFAULT 0,
  trivial_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_run_id uuid NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('Blocker', 'Critical', 'Major', 'Minor', 'Trivial')),
  requirement_id text NOT NULL,
  message text NOT NULL,
  location_file text,
  location_line integer,
  stage text,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: audit tables are admin-only
ALTER TABLE audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_audit_runs" ON audit_runs
  FOR ALL TO authenticated
  USING (auth_user_role() = 'admin');

CREATE POLICY "admin_all_audit_findings" ON audit_findings
  FOR ALL TO authenticated
  USING (auth_user_role() = 'admin');;
