## 2026-05-04 - Missing Error Check on Audit Log Insert

**Vulnerability:** Supabase insert operation into the audit_logs table inside resolve-mystery-reward edge function did not check for errors, potentially causing silent failures and unlogged critical operations.
**Learning:** The standard convention 'if (error) throw error' is mandatory for all database operations including inserts to guarantee data integrity.
**Prevention:** Always store the result of an insert and explicitly verify the error property before continuing execution.
