// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PurchaseConfirmDialog from '@/pages/student/marketplace/PurchaseConfirmDialog';
import type { MarketplaceItem } from '@/hooks/useMarketplace';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mutateMock = vi.fn();
let isPendingMock = false;

vi.mock('@/hooks/usePurchase', () => ({
  usePurchaseItem: () => ({
    mutate: mutateMock,
    isPending: isPendingMock,
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeItem = (overrides: Partial<MarketplaceItem> = {}): MarketplaceItem => ({
  id: 'item-001',
  name: 'Ocean Blue Theme',
  description: 'A cool blue theme',
  category: 'cosmetic',
  sub_category: 'profile_theme',
  xp_price: 500,
  level_requirement: 0,
  stock_type: 'unlimited',
  stock_quantity: null,
  icon_identifier: 'palette',
  metadata: {},
  is_active: true,
  ...overrides,
});

const renderDialog = (
  item: MarketplaceItem | null = makeItem(),
  balance = 1000,
  open = true,
) => {
  const onOpenChange = vi.fn();
  render(
    <PurchaseConfirmDialog
      item={item}
      balance={balance}
      open={open}
      onOpenChange={onOpenChange}
    />,
  );
  return { onOpenChange };
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PurchaseConfirmDialog', () => {
  beforeEach(() => {
    mutateMock.mockReset();
    isPendingMock = false;
  });

  it('renders item name, XP cost, current balance, and remaining balance', () => {
    renderDialog(makeItem({ xp_price: 300 }), 1000);

    expect(screen.getByText('Ocean Blue Theme')).toBeInTheDocument();
    expect(screen.getByText('300 XP')).toBeInTheDocument();
    expect(screen.getByText('1,000 XP')).toBeInTheDocument();
    expect(screen.getByText('700 XP')).toBeInTheDocument();
  });

  it('shows sale price when sale is active (effective_price set)', () => {
    renderDialog(makeItem({ xp_price: 500, effective_price: 350 }), 1000);

    expect(screen.getByText('350 XP')).toBeInTheDocument();
    // Remaining = 1000 - 350 = 650
    expect(screen.getByText('650 XP')).toBeInTheDocument();
  });

  it('disables confirm button when balance is insufficient', () => {
    renderDialog(makeItem({ xp_price: 500 }), 100);

    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
    expect(confirmBtn).toBeDisabled();
    expect(screen.getByText(/don't have enough xp/i)).toBeInTheDocument();
  });

  it('shows loading spinner during purchase mutation', () => {
    isPendingMock = true;
    renderDialog();

    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('displays error message on purchase failure', async () => {
    mutateMock.mockImplementation((_id: string, opts: { onError: (err: Error & { code?: string }) => void }) => {
      const err = new Error('INSUFFICIENT_BALANCE') as Error & { code?: string };
      err.code = 'INSUFFICIENT_BALANCE';
      opts.onError(err);
    });

    renderDialog(makeItem(), 1000);
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalled();
    });
  });

  it('calls mutate with item_id when confirmed', () => {
    renderDialog(makeItem({ id: 'item-xyz' }), 1000);
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(mutateMock).toHaveBeenCalledWith('item-xyz', expect.any(Object));
  });

  it('calls onOpenChange(false) when cancel is clicked', () => {
    const { onOpenChange } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('returns null when item is null', () => {
    const { container } = render(
      <PurchaseConfirmDialog item={null} balance={100} open={true} onOpenChange={vi.fn()} />,
    );
    // Dialog should not render any content
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
