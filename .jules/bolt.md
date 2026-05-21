YYYY-MM-DD - [Curriculum Matrix Filtering O(P*C*M) Lookup Optimization]
Learning: Computing large matrices natively using nested `O(P*C*M)` loops for mapping lookup kills frontend responsiveness as scale grows (especially in Outcome-Based Education where there can be dozens of PLOs, dozens of Courses, and hundreds of Mappings).
Action: Pre-compute a lookup table using a `Map` keyed by concatenated identifiers (e.g. `source_id_target_id`) to transform an `O(P*C*M)` filtering step down to `O(M + P*C)` before running the main layout matrix nested loops.
YYYY-MM-DD - [Institution-Wide Outcome Score Aggregation O(N*M) Lookup Optimization]
Learning: Calculating an exact average inside a loop over departments creates unnecessary repetition and O(N*M) nested looping overhead for institution-wide scores (like ILOs) that are exactly the same across all departments.
Action: Compute a single global average for institution-wide scores outside of the department map/loop, and assign the pre-computed average directly to each department record instead.
