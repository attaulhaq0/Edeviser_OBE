2024-06-25 - [Optimize Curriculum Matrix Nested Loops]
Learning: Deeply nested loops in TanStack queries that map over large arrays (like mappings, PLOs, and courses in `useCurriculumMatrix`) create invisible O(P*C*M) execution bottlenecks on the main thread, resulting in jank during matrix rendering.
Action: Whenever looping over multiple arrays sequentially to find associations, replace nested `.filter()` inside loops with O(1) `Map` lookups (like `mappingCounts` using a compound key `${plo.id}_${course.id}`) which reduces complexity to O(M + P\*C).
