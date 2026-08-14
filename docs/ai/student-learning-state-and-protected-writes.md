# Student Learning State and protected writes

## Canonical state

`student_learning_states` is a versioned materialized projection. It is rebuilt
by deterministic PostgreSQL code from authoritative E Deviser records; neither
the model nor the browser can insert or update it.

The version 1 projection contains:

- CLO, PLO, and ILO attainment with sample-based confidence and observation
  timestamps;
- Sub-CLO references, explicitly marked as awaiting direct evidence when no
  canonical Sub-CLO attainment exists;
- a 28-day habit summary;
- institution-configured, deterministic risk, strength, and opportunity
  thresholds (with the canonical 70/85/70 defaults when settings are absent);
- current goals, active proposals/interventions, recent immutable evidence,
  recommendation history, approved/executed actions, and the reserved measured
  effects collection used by the evaluator phase;
- source freshness, calculation time, version, and a deterministic state hash.

RLS allows the student, a verified linked parent, and an institution admin to
read the appropriate global row. Teachers and coordinators cannot read that row
directly: a database-authorized projection RPC verifies current assignment and
returns only the requested course or program slice. This prevents a teacher
assigned to one course from receiving another course's data. Authenticated
clients have no state-write grant.

## Protected write boundary

The initial write registry contains only two typed personal tools:

- `create_goal@1.0.0`
- `create_planner_session@1.0.0`

Every other protected proposal remains non-executable until an explicit typed
executor is added. Unknown actions, extra payload fields, raw SQL, arbitrary
table names, and arbitrary RPC names are rejected.

Execution requires all of the following to still be true:

1. `AI_FEATURE_ENABLED=true` and `AI_PROTECTED_WRITES_ENABLED=true`;
2. proposal status is `approved` and it has not expired;
3. caller is the exact bound approver with the required role and institution;
4. action exists in the write registry and its payload validates;
5. current student/course ownership remains authorized;
6. the service-only database executor independently repeats the identity,
   institution, approval, expiry, tool, payload, and enrollment checks.

The typed side effect, unique execution receipt, tool audit, proposal transition
to `executed`, and Learning State refresh share one database transaction. A
retry returns the prior receipt and cannot create a second goal or study
session.

The approval matrix remains deterministic:

| Scope                              | Required approver      |
| ---------------------------------- | ---------------------- |
| Personal student action            | Exact student          |
| Course/intervention action         | Assigned teacher       |
| Program/PLO/CQI action             | Assigned coordinator   |
| Institution/ILO/policy/role action | Institution admin      |
| Parent support acknowledgement     | Verified linked parent |

Approval alone never executes an action. A separate execution request performs
all current-authorization checks. Production flags remain `false` until the
controlled rollout is explicitly configured.
