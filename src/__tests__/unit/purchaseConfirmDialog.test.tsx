// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PurchaseConfirmDialog from '@/pages/student/marketplace/PurchaseConfirmDialog';
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

describe('PurchaseConfirmDialog', () => {
  it('renders item name and cost', () => {
    render(
      <PurchaseConfirmDialog
        item={makeItem()}
        currentBalance={1000}
        isPending={false}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('Ocean Blue Theme')).toBeTruthy();
    expect(screen.getByText('Item Cost')).toBeTruthy();
  });

  it('shows remaining balance after purchase', () => {
    render(
      <PurchaseConfirmDialog
        item={makeItem({ effective_price: 300 })}
        currentBalance={1000}
        isPending={false}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('Remaining Balance')).toBeTruthy();
    // Remaining = 1000 - 300 = 700
    expect(screen.getByText(/700/)).toBeTruthy();
  });

  it('shows insufficient balance warning when cannot afford', () => {
    render(
      <PurchaseConfirmDialog
        item={makeItem({ effective_price: 500 })}
        currentBalance={200}
        isPending={false}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText(/don't have enough XP/)).toBeTruthy();
  });

  it('disables confirm button when cannot afford', () => {
    render(
      <PurchaseConfirmDialog
        item={makeItem({ effective_price: 500 })}
        currentBalance={200}
        isPending={false}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: /Confirm Purchase/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('disables confirm button when pending', () => {
    render(
      <PurchaseConfirmDialog
        item={makeItem()}
        currentBalance={1000}
        isPending={true}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: /Confirm Purchase/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    render(
      <PurchaseConfirmDialog
        item={makeItem()}
        currentBalance={1000}
        isPending={false}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: /Confirm Purchase/i });
    await userEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('shows sale price with strikethrough when sale is active', () => {
    render(
      <PurchaseConfirmDialog
        item={makeItem({ xp_price: 500, effective_price: 375, sale_discount: 25 })}
        currentBalance={1000}
        isPending={false}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    // Original price should be shown with strikethrough
    expect(screen.getByText('500')).toBeTruthy();
    expect(screen.getByText(/375 XP/)).toBeTruthy();
  });

  it('returns null when item is null', () => {
    const { container } = render(
      <PurchaseConfirmDialog
        item={null}
        currentBalance={1000}
        isPending={false}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(container.innerHTML).toBe('');
  });
});
