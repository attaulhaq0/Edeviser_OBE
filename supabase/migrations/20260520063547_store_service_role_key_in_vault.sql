-- L2-1 Fix Step 1: Store service role key in Vault for trigger_attainment_rollup
SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkbGd0YnZ4bHhqcGNkZGphenp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc0MjIzMCwiZXhwIjoyMDg3MzE4MjMwfQ.Fzmgu6F6MivwqXGGLHVZRJVv6L0xCxCPru4I1vGdapY',
  'service_role_key',
  'Service role key for trigger_attainment_rollup Edge Function calls'
);;
