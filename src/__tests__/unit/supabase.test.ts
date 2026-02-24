import { describe, it, expect } from 'vitest';

describe('Supabase client singleton', () => {
  it('exports createClient from @supabase/supabase-js', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    expect(typeof createClient).toBe('function');
  });

  it('supabase module exports a client instance', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

    expect(source).toContain("import { createClient } from '@supabase/supabase-js'");
    expect(source).toContain('VITE_SUPABASE_URL');
    expect(source).toContain('VITE_SUPABASE_ANON_KEY');
    expect(source).toContain('export const supabase');
    expect(source).toContain('createClient<Database>');
  });

  it('falls back to localhost when VITE_SUPABASE_URL is missing', async () => {
    const source = (await import('fs')).readFileSync('src/lib/supabase.ts', 'utf-8');
    expect(source).toContain("VITE_SUPABASE_URL ?? 'http://localhost:54321'");
  });

  it('falls back to placeholder when VITE_SUPABASE_ANON_KEY is missing', async () => {
    const source = (await import('fs')).readFileSync('src/lib/supabase.ts', 'utf-8');
    expect(source).toContain("VITE_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'");
  });
});
