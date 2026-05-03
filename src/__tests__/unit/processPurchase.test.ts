// @vitest-environment happy-dom
// Unit tests for process-purchase Edge Function logic
// Tests the pure validation and response mapping logic

import { describe, it, expect } from 'vitest';

// ─── Types (mirroring Edge Function) ────────────────────────────────────────

type PurchaseErrorCode =
  | 'INSUFFICIENT_BALANCE'
  | 'LEVEL_REQUIREMENT'
  | 'OUT_OF_STOCK'
  | 'ALREADY_OWNED'
  | 'ITEM_INACTIVE'
  | 'SALE_EXPIRED'
  | 'MAX_INVENTORY';

interface PurchaseRPCResult {
  success: boolean;
  purchase_id?: string;
  xp_cost?: number;
  new_balance?: number;
  item_category?: string;
  item_sub_category?: string;
  error_code?: PurchaseErrorCode;
}

// ─── Pure functions extracted from Edge Function ────────────────────────────

const errorCodeStatusMap: Record<PurchaseErrorCode, number> = {
  INSUFFICIENT_BALANCE: 400,
  LEVEL_REQUIREMENT: 403,
  OUT_OF_STOCK: 409,
  ALREADY_OWNED: 409,
  ITEM_INACTIVE: 404,
  SALE_EXPIRED: 409,
  MAX_INVENTORY: 409,
};

const errorMessages: Record<PurchaseErrorCode, string> = {
  INSUFFICIENT_BALANCE: 'Insufficient XP balance for this purchase',
  LEVEL_REQUIREMENT: 'You do not meet the level requirement for this item',
  OUT_OF_STOCK: 'This item is out of stock',
  ALREADY_OWNED: 'You already own this item',
  ITEM_INACTIVE: 'This item is no longer available',
  SALE_EXPIRED: 'The sale for this item has expired',
  MAX_INVENTORY: 'You have reached the maximum inventory for this item type',
};

function mapRPCResultToResponse(result: PurchaseRPCResult): {
  status: number;
  body: Record<string, unknown>;
} {
  if (result.success) {
    return {
      status: 200,
      body: {
        success: true,
        purchase_id: result.purchase_id,
        xp_cost: result.xp_cost,
        new_balance: result.new_balance,
        item_category: result.item_category,
        item_sub_category: result.item_sub_category,
      },
    };
  }

  const code = result.error_code as PurchaseErrorCode;
  return {
    status: errorCodeStatusMap[code] ?? 400,
    body: {
      success: false,
      error: errorMessages[code] ?? 'Purchase failed',
      error_code: code,
    },
  };
}

function isPostPurchaseBoostActivation(result: PurchaseRPCResult): boolean {
  return result.success === true && result.item_category === 'power_up' && result.item_sub_category === 'xp_boost';
}

function isPostPurchaseStreakShield(result: PurchaseRPCResult): boolean {
  return result.success === true && result.item_category === 'power_up' && result.item_sub_category === 'streak_shield';
}

function validateItemId(itemId: unknown): boolean {
  if (!itemId || typeof itemId !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(itemId);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('processPurchase — response mapping', () => {
  it('maps successful purchase to 200 with all fields', () => {
    const result: PurchaseRPCResult = {
      success: true,
      purchase_id: 'p-1',
      xp_cost: 500,
      new_balance: 1500,
      item_category: 'cosmetic',
      item_sub_category: 'profile_theme',
    };

    const response = mapRPCResultToResponse(result);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.purchase_id).toBe('p-1');
    expect(response.body.xp_cost).toBe(500);
    expect(response.body.new_balance).toBe(1500);
  });

  it('maps INSUFFICIENT_BALANCE to 400', () => {
    const result: PurchaseRPCResult = { success: false, error_code: 'INSUFFICIENT_BALANCE' };
    const response = mapRPCResultToResponse(result);
    expect(response.status).toBe(400);
    expect(response.body.error_code).toBe('INSUFFICIENT_BALANCE');
  });

  it('maps LEVEL_REQUIREMENT to 403', () => {
    const result: PurchaseRPCResult = { success: false, error_code: 'LEVEL_REQUIREMENT' };
    const response = mapRPCResultToResponse(result);
    expect(response.status).toBe(403);
  });

  it('maps OUT_OF_STOCK to 409', () => {
    const result: PurchaseRPCResult = { success: false, error_code: 'OUT_OF_STOCK' };
    const response = mapRPCResultToResponse(result);
    expect(response.status).toBe(409);
  });

  it('maps ALREADY_OWNED to 409', () => {
    const result: PurchaseRPCResult = { success: false, error_code: 'ALREADY_OWNED' };
    const response = mapRPCResultToResponse(result);
    expect(response.status).toBe(409);
  });

  it('maps ITEM_INACTIVE to 404', () => {
    const result: PurchaseRPCResult = { success: false, error_code: 'ITEM_INACTIVE' };
    const response = mapRPCResultToResponse(result);
    expect(response.status).toBe(404);
  });

  it('maps SALE_EXPIRED to 409', () => {
    const result: PurchaseRPCResult = { success: false, error_code: 'SALE_EXPIRED' };
    const response = mapRPCResultToResponse(result);
    expect(response.status).toBe(409);
  });

  it('maps MAX_INVENTORY to 409', () => {
    const result: PurchaseRPCResult = { success: false, error_code: 'MAX_INVENTORY' };
    const response = mapRPCResultToResponse(result);
    expect(response.status).toBe(409);
  });
});

describe('processPurchase — post-purchase activation detection', () => {
  it('detects XP boost activation', () => {
    const result: PurchaseRPCResult = {
      success: true,
      purchase_id: 'p-1',
      xp_cost: 300,
      new_balance: 700,
      item_category: 'power_up',
      item_sub_category: 'xp_boost',
    };
    expect(isPostPurchaseBoostActivation(result)).toBe(true);
    expect(isPostPurchaseStreakShield(result)).toBe(false);
  });

  it('detects streak shield activation', () => {
    const result: PurchaseRPCResult = {
      success: true,
      purchase_id: 'p-2',
      xp_cost: 200,
      new_balance: 800,
      item_category: 'power_up',
      item_sub_category: 'streak_shield',
    };
    expect(isPostPurchaseStreakShield(result)).toBe(true);
    expect(isPostPurchaseBoostActivation(result)).toBe(false);
  });

  it('does not activate for cosmetic purchases', () => {
    const result: PurchaseRPCResult = {
      success: true,
      purchase_id: 'p-3',
      xp_cost: 500,
      new_balance: 500,
      item_category: 'cosmetic',
      item_sub_category: 'profile_theme',
    };
    expect(isPostPurchaseBoostActivation(result)).toBe(false);
    expect(isPostPurchaseStreakShield(result)).toBe(false);
  });

  it('does not activate for failed purchases', () => {
    const result: PurchaseRPCResult = {
      success: false,
      error_code: 'INSUFFICIENT_BALANCE',
    };
    expect(isPostPurchaseBoostActivation(result)).toBe(false);
    expect(isPostPurchaseStreakShield(result)).toBe(false);
  });
});

describe('processPurchase — item_id validation', () => {
  it('accepts valid UUID', () => {
    expect(validateItemId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('rejects non-UUID string', () => {
    expect(validateItemId('not-a-uuid')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateItemId('')).toBe(false);
  });

  it('rejects null', () => {
    expect(validateItemId(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(validateItemId(undefined)).toBe(false);
  });

  it('rejects number', () => {
    expect(validateItemId(123)).toBe(false);
  });
});
