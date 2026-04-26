// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createSaleEventSchema } from '@/lib/marketplaceSchemas';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SaleEventForm validation', () => {
  const validData = {
    name: 'Weekend Sale',
    discount_percentage: 20,
    start_date: '2026-07-01T00:00:00.000Z',
    end_date: '2026-07-07T00:00:00.000Z',
    item_ids: ['550e8400-e29b-41d4-a716-446655440000'],
  };

  it('validates discount_percentage is at least 5', () => {
    const result = createSaleEventSchema.safeParse({
      ...validData,
      discount_percentage: 4,
    });
    expect(result.success).toBe(false);
  });

  it('validates discount_percentage is at most 90', () => {
    const result = createSaleEventSchema.safeParse({
      ...validData,
      discount_percentage: 91,
    });
    expect(result.success).toBe(false);
  });

  it('accepts discount_percentage of 5', () => {
    const result = createSaleEventSchema.safeParse({
      ...validData,
      discount_percentage: 5,
    });
    expect(result.success).toBe(true);
  });

  it('accepts discount_percentage of 90', () => {
    const result = createSaleEventSchema.safeParse({
      ...validData,
      discount_percentage: 90,
    });
    expect(result.success).toBe(true);
  });

  it('validates end_date is after start_date', () => {
    const result = createSaleEventSchema.safeParse({
      ...validData,
      start_date: '2026-07-07T00:00:00.000Z',
      end_date: '2026-07-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects end_date equal to start_date', () => {
    const result = createSaleEventSchema.safeParse({
      ...validData,
      start_date: '2026-07-01T00:00:00.000Z',
      end_date: '2026-07-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('requires at least one item selected', () => {
    const result = createSaleEventSchema.safeParse({
      ...validData,
      item_ids: [],
    });
    expect(result.success).toBe(false);
  });

  it('shows selected items count (accepts multiple items)', () => {
    const result = createSaleEventSchema.safeParse({
      ...validData,
      item_ids: [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.item_ids).toHaveLength(3);
    }
  });

  it('submits valid form data', () => {
    const result = createSaleEventSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Weekend Sale');
      expect(result.data.discount_percentage).toBe(20);
      expect(result.data.item_ids).toHaveLength(1);
    }
  });

  it('rejects non-UUID item_ids', () => {
    const result = createSaleEventSchema.safeParse({
      ...validData,
      item_ids: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = createSaleEventSchema.safeParse({
      ...validData,
      name: '',
    });
    expect(result.success).toBe(false);
  });
});
