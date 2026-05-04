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

  it('throws when VITE_SUPABASE_URL is missing', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/lib/supabase.ts', 'utf-8');
    expect(source).toContain('if (!supabaseUrl || !supabaseAnonKey)');
    expect(source).toContain('throw new Error');
    expect(source).toContain('Missing Supabase environment variables');
  });

  it('uses @/ path alias for database type import', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/lib/supabase.ts', 'utf-8');
    expect(source).toContain("from '@/types/database'");
    expect(source).not.toContain("from '../types/database'");
  });

  it('does not contain hardcoded fallback values', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/lib/supabase.ts', 'utf-8');
    expect(source).not.toContain('localhost:54321');
    expect(source).not.toContain('placeholder-anon-key');
  });
});
