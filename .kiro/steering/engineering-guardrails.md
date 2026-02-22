---
inclusion: always
---

# Engineering Guardrails

## Non-Negotiable Rules

### API Safety
- Never break existing APIs — all changes must be backward-compatible
- When modifying a function signature, check all call sites before changing
- Deprecate before removing — never delete a public export without a migration path

### TypeScript Strictness
- No `any` types — use `unknown` with type guards, generics, or proper interfaces
- No `@ts-ignore` or `@ts-expect-error` without a linked issue explaining why
- All function parameters and return types must be explicitly typed
- Use discriminated unions over loose string types where applicable

### SOLID Principles
- Single Responsibility: each file/function does one thing well
- Open/Closed: extend via composition, not modification of existing code
- Liskov Substitution: subtypes must be substitutable for their base types
- Interface Segregation: prefer small, focused interfaces over large ones
- Dependency Inversion: depend on abstractions (types/interfaces), not concrete implementations

### Clean Architecture
- Components never call Supabase directly — always go through TanStack Query hooks
- Business logic lives in `/src/lib/`, not in components or hooks
- Side effects (API calls, storage) are isolated in hooks and services
- No circular dependencies between modules

### No Duplication
- Before creating a new utility, check if one already exists in `/src/lib/`
- Before creating a new component, check `/src/components/shared/` and `/src/components/ui/`
- Extract repeated logic (3+ occurrences) into shared utilities or custom hooks
- Shared Zod schemas live in `/src/lib/schemas/` — never redefine validation inline

### Testing Requirements
- Every new feature must include tests — no exceptions
- Property-based tests for business logic (schemas, calculations, state transitions)
- Unit tests for utilities and hooks
- Test files follow naming: `*.test.ts` or `*.property.test.ts`
- Minimum 100 iterations for property-based tests (fast-check)

### Error Handling
- Never swallow errors silently — at minimum log to console
- User-facing errors use Sonner toast notifications
- API errors must be typed and handled explicitly
- Use error boundaries for component-level failures
