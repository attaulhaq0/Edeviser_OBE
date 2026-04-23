# Manual Steps Required Before Deployment

These steps cannot be automated via SQL migrations or CLI and must be performed manually.

## 1. Enable Leaked Password Protection

**Priority**: HIGH (Security)

1. Navigate to [Supabase Dashboard](https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/auth/settings)
2. Go to **Auth → Settings**
3. Enable **"Leaked password protection"** (HaveIBeenPwned integration)
4. Save changes

This prevents users from creating accounts with passwords known to be compromised.

## 2. Deploy Edge Functions

**Priority**: CRITICAL (All backend logic depends on this)

```bash
chmod +x scripts/deploy-edge-functions.sh
./scripts/deploy-edge-functions.sh
```

Requires Supabase CLI authenticated (`supabase login`). The script deploys all 36 Edge Functions.

## 3. Save database.ts from IDE

**Priority**: MEDIUM (Type safety)

The `src/types/database.ts` file has the correct content in the IDE buffer but the disk file is corrupted. Save it (Ctrl+S) then:
1. Remove `src/types/database-generated.ts`
2. Revert `tsconfig.json` path override (remove `@/types/database` mapping and `exclude`)
3. Revert `eslint.config.js` (remove `src/types/database.ts` from ignores)
4. Revert `src/lib/supabase.ts` import back to `import type { Database } from '../types/database'`
