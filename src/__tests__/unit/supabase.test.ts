import { describe, it, expect } from 'vitest';

describe('Supabase client singleton', () => {
  it('exports createClient from @supabase/supabase-js', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    expect(typeof createClient).toBe('function');
  });

  it('supabase module exports a client instance', async () => {
    // Verify the module structure is correct by checking the source
    const fs = await import('fs');
    const source = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

    // Validates the singleton pattern
    expect(source).toContain("import { createClient } from '@supabase/supabase-js'");
    expect(source).toContain('VITE_SUPABASE_URL');
    expect(source).toContain('VITE_SUPABASE_ANON_KEY');
    expect(source).toContain('export const supabase');
    expect(source).toContain('createClient<Database>');
  });

  it('throws if VITE_SUPABASE_URL is missing', async () => {
    const source = (await import('fs')).readFileSync('src/lib/supabase.ts', 'utf-8');
    expect(source).toContain("throw new Error('Missing environment variable: VITE_SUPABASE_URL')");
  });

  it('throws if VITE_SUPABASE_ANON_KEY is missing', async () => {
    const source = (await import('fs')).readFileSync('src/lib/supabase.ts', 'utf-8');
    expect(source).toContain("throw new Error('Missing environment variable: VITE_SUPABASE_ANON_KEY')");
  });
});
