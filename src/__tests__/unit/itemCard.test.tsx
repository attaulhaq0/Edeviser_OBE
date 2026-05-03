// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemCard from '@/pages/student/marketplace/ItemCard';
import type { MarketplaceItem } from '@/hooks/useMarketplace';

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeItem = (overrides: Partial<MarketplaceItem> = {}): MarketplaceItem => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  institution_id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Ocean Blue Theme',
  description: 'A calming ocean-inspired color palette',
  category: 'cosmetic',
  sub_category: 'profile_theme',
  xp_price: 500,
  level_requirement: 0,
  stock_type: 'unlimited',
  stock_quantity: null,
  icon_identifier: 'palette',
  metadata: {},
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  sale_discount: 0,
  effective_price: 500,
  ...overrides,
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ItemCard', () => {
  it('renders item name, description, and price', () => {
    render(
      <ItemCard item={makeItem()} studentLevel={10} isOwned={false} onPurchase={vi.fn()} />,
    );

    // Name appears in both the card heading and the cosmetic preview
    expect(screen.getAllByText('Ocean Blue Theme').length).toBeGreaterThan(0);
    expect(screen.getByText('A calming ocean-inspired color palette')).toBeTruthy();
    expect(screen.getAllByText(/500/).length).toBeGreaterThan(0);
  });

  it('shows locked state when student level is below requirement', () => {
    render(
      <ItemCard
        item={makeItem({ level_requirement: 15 })}
        studentLevel={5}
        isOwned={false}
        onPurchase={vi.fn()}
      />,
    );

    expect(screen.getByText(/Requires Level 15/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Locked/i })).toBeDisabled();
  });

  it('shows owned state when student already owns the item', () => {
    render(
      <ItemCard item={makeItem()} studentLevel={10} isOwned={true} onPurchase={vi.fn()} />,
    );

    expect(screen.getByText('Owned')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Already Owned/i })).toBeDisabled();
  });

  it('shows sale price with strikethrough when sale is active', () => {
    render(
      <ItemCard
        item={makeItem({ xp_price: 500, effective_price: 375, sale_discount: 25 })}
        studentLevel={10}
        isOwned={false}
        onPurchase={vi.fn()}
      />,
    );

    // Original price with strikethrough
    expect(screen.getByText('500')).toBeTruthy();
    // Discounted price
    expect(screen.getByText(/375 XP/)).toBeTruthy();
  });

  it('shows out-of-stock state for limited items with zero stock', () => {
    render(
      <ItemCard
        item={makeItem({ stock_type: 'limited', stock_quantity: 0 })}
        studentLevel={10}
        isOwned={false}
        onPurchase={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Out of Stock/i })).toBeDisabled();
  });

  it('shows remaining stock for limited items', () => {
    render(
      <ItemCard
        item={makeItem({ stock_type: 'limited', stock_quantity: 5 })}
        studentLevel={10}
        isOwned={false}
        onPurchase={vi.fn()}
      />,
    );

    expect(screen.getByText('5 remaining')).toBeTruthy();
  });

  it('calls onPurchase when Buy Now is clicked', async () => {
    const onPurchase = vi.fn();
    const item = makeItem();
    render(
      <ItemCard item={item} studentLevel={10} isOwned={false} onPurchase={onPurchase} />,
    );

    const buyBtn = screen.getByRole('button', { name: /Buy Now/i });
    await userEvent.click(buyBtn);
    expect(onPurchase).toHaveBeenCalledWith(item);
  });

  it('renders non-cosmetic items with icon instead of preview', () => {
    render(
      <ItemCard
        item={makeItem({ category: 'power_up', sub_category: 'xp_boost', icon_identifier: 'zap' })}
        studentLevel={10}
        isOwned={false}
        onPurchase={vi.fn()}
      />,
    );

    expect(screen.getByText('Ocean Blue Theme')).toBeTruthy();
  });
});
