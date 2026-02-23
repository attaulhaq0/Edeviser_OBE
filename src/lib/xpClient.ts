// =============================================================================
// XP Client — Fire-and-forget XP award via the award-xp Edge Function
// =============================================================================

import { supabase } from '@/lib/supabase';
import type { XPSource } from '@/types/app';

export interface AwardXPParams {
  studentId: string;
  xpAmount: number;
  source: XPSource;
  referenceId?: string;
  note?: string;
}

export interface AwardXPResult {
  success: boolean;
  xp_awarded: number;
  new_total: number;
  level_up: boolean;
  new_level: number;
}

/**
 * Fire-and-forget XP award via the award-xp Edge Function.
 * Never blocks user-facing flows — errors are logged silently.
 */
export async function awardXP(params: AwardXPParams): Promise<AwardXPResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('award-xp', {
      body: {
        student_id: params.studentId,
        xp_amount: params.xpAmount,
        source: params.source,
        reference_id: params.referenceId,
        note: params.note,
      },
    });

    if (error) {
      console.error('[XP Client] Award failed:', error.message);
      return null;
    }

    return data as AwardXPResult;
  } catch (err) {
    console.error('[XP Client] Unexpected error:', err);
    return null;
  }
}
