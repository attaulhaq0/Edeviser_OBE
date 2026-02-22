---
inclusion: always
---

# Supabase Patterns for Edeviser

## RLS Policy Templates

### Standard CRUD Pattern (institution-scoped)
Every table follows this base pattern. Adjust per role as needed.

```sql
-- Admin: full access within institution
CREATE POLICY "admin_all" ON table_name
  FOR ALL TO authenticated
  USING (auth_user_role() = 'admin' AND institution_id = auth_institution_id());

-- Read-only for other roles (customize per table)
CREATE POLICY "role_select" ON table_name
  FOR SELECT TO authenticated
  USING (institution_id = auth_institution_id());
```

### Student-Scoped Pattern
For tables where students only see their own data:
```sql
CREATE POLICY "student_own" ON table_name
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student' AND student_id = auth.uid()
  );
```

### Append-Only Pattern (evidence, audit_logs, xp_transactions)
```sql
-- INSERT only, no UPDATE or DELETE policies
CREATE POLICY "insert_only" ON table_name
  FOR INSERT TO authenticated
  WITH CHECK (true);
-- No UPDATE or DELETE policies = immutable
```

### Parent Read-Only Pattern
```sql
CREATE POLICY "parent_read_linked" ON table_name
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'parent'
    AND student_id IN (
      SELECT student_id FROM parent_student_links
      WHERE parent_id = auth.uid() AND verified = true
    )
  );
```

## TanStack Query Patterns

### Standard Query Hook
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export const useEntityList = (filters: Record<string, unknown>) => {
  return useQuery({
    queryKey: queryKeys.entity.list(filters),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table_name')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};
```

### Optimistic Update Pattern
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateEntityInput) => {
      const { data: result, error } = await supabase
        .from('table_name')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entity.lists() });
    },
    // Use optimistic updates for frequently-used mutations:
    // onMutate: async (newData) => {
    //   await queryClient.cancelQueries({ queryKey: queryKeys.entity.lists() });
    //   const previous = queryClient.getQueryData(queryKeys.entity.lists());
    //   queryClient.setQueryData(queryKeys.entity.lists(), (old) => [...old, { ...newData, id: 'temp' }]);
    //   return { previous };
    // },
    // onError: (_err, _new, context) => {
    //   queryClient.setQueryData(queryKeys.entity.lists(), context?.previous);
    // },
  });
};
```

### Mutation with Audit Logging
All admin mutations must log to audit_logs:
```typescript
mutationFn: async (data) => {
  const { data: result, error } = await supabase.from('table').insert(data).select().single();
  if (error) throw error;
  await logAuditEvent({
    action: 'create',
    entity_type: 'table',
    entity_id: result.id,
    changes: data,
    performed_by: userId,
  });
  return result;
},
```

## Edge Function Patterns

### Standard Edge Function Structure
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    // ... logic
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Edge Function Rules
- Use `SUPABASE_SERVICE_ROLE_KEY` for server-side operations (bypasses RLS)
- Use `SUPABASE_URL` from env, never hardcode
- Always handle CORS preflight
- Return structured JSON errors with appropriate status codes
- Use Deno imports (esm.sh), not npm packages
- Secrets via `Deno.env.get()`, stored in Supabase Dashboard

## Realtime Subscription Patterns

### Shared Subscription Manager
Never create per-component subscriptions. Use the centralized `useRealtime` hook:
```typescript
// Components register callbacks, don't manage channels directly
const { subscribe, unsubscribe } = useRealtime();

useEffect(() => {
  const id = subscribe('table_name', { event: 'INSERT' }, (payload) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.entity.lists() });
  });
  return () => unsubscribe(id);
}, []);
```

### Reconnection Pattern
- On connection failure: fall back to polling (30s refetchInterval)
- Show "Live updates paused" banner in polling mode
- Exponential backoff for reconnection attempts
- Clean up all subscriptions on component unmount

## Common Pitfalls to Avoid
- Never use `supabase` client directly in components — always through hooks
- Never use `.single()` on queries that might return 0 rows — use `.maybeSingle()`
- Always check `error` before using `data` from Supabase responses
- Never store service role key in client-side code
- Always scope realtime subscriptions with filters (don't subscribe to entire tables)
- Use `.select('id, name, ...')` instead of `.select('*')` for large tables
