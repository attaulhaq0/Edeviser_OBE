// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ItemCard from '@/pages/student/marketplace/ItemCard';
import type { MarketplaceItem } from '@/hooks/useMarketplace';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/shared/SaleBadge', () => ({
  default: ({ discountPercentage }: { discountPercentage: number }) => (
    <span data-testid="sale-badge">{discountPercentage}% OFF</span>
  ),
}));

vi.mock('@/components/shared/CosmeticPreview', () => ({
  default: () => <div data-testid="cosmetic-preview" />,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeItem = (overrides: Partial<MarketplaceItem> = {}): MarketplaceItem => ({
  id: 'item-001',
  name: 'Ocean Blue Theme',
  description: 'A cool blue profile theme',
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

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ItemCard', () => {
  it('renders item name, description, price, and icon', () => {
    const onBuy = vi.fn();
    render(<ItemCard item={makeItem()} studentLevel={5} owned={false} onBuy={onBuy} />);

    expect(screen.getByText('Ocean Blue Theme')).toBeInTheDocument();
    expect(screen.getByText('A cool blue profile theme')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('shows locked overlay with level requirement when student level is below requirement', () => {
    const onBuy = vi.fn();
    render(
      <ItemCard item={makeItem({ level_requirement: 10 })} studentLevel={3} owned={false} onBuy={onBuy} />,
    );

    expect(screen.getByText(/reach level 10/i)).toBeInTheDocument();
  });

  it('shows "Owned" badge for one_per_student items already purchased', () => {
    const onBuy = vi.fn();
    render(
      <ItemCard
        item={makeItem({ stock_type: 'one_per_student' })}
        studentLevel={5}
        owned={true}
        onBuy={onBuy}
      />,
    );

    expect(screen.getByText('Owned')).toBeInTheDocument();
  });

  it('shows sale badge with discounted price when sale is active', () => {
    const onBuy = vi.fn();
    render(
      <ItemCard
        item={makeItem({ xp_price: 500, effective_price: 400, discount_percentage: 20 })}
        studentLevel={5}
        owned={false}
        onBuy={onBuy}
      />,
    );

    expect(screen.getByTestId('sale-badge')).toBeInTheDocument();
    expect(screen.getByText('400')).toBeInTheDocument();
    // Original price shown with strikethrough
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('shows "Sold Out" when stock_quantity is 0 for limited items', () => {
    const onBuy = vi.fn();
    render(
      <ItemCard
        item={makeItem({ stock_type: 'limited', stock_quantity: 0 })}
        studentLevel={5}
        owned={false}
        onBuy={onBuy}
      />,
    );

    expect(screen.getByText('Sold Out')).toBeInTheDocument();
  });

  it('shows remaining stock count for limited items with stock', () => {
    const onBuy = vi.fn();
    render(
      <ItemCard
        item={makeItem({ stock_type: 'limited', stock_quantity: 7 })}
        studentLevel={5}
        owned={false}
        onBuy={onBuy}
      />,
    );

    expect(screen.getByText('7 left')).toBeInTheDocument();
  });

  it('does not show buy button when locked', () => {
    const onBuy = vi.fn();
    render(
      <ItemCard item={makeItem({ level_requirement: 10 })} studentLevel={2} owned={false} onBuy={onBuy} />,
    );

    expect(screen.queryByRole('button', { name: /buy/i })).not.toBeInTheDocument();
  });

  it('does not show buy button when owned', () => {
    const onBuy = vi.fn();
    render(
      <ItemCard item={makeItem()} studentLevel={5} owned={true} onBuy={onBuy} />,
    );

    expect(screen.queryByRole('button', { name: /buy/i })).not.toBeInTheDocument();
  });

  it('calls onBuy with item when buy button is clicked', () => {
    const onBuy = vi.fn();
    const item = makeItem();
    render(<ItemCard item={item} studentLevel={5} owned={false} onBuy={onBuy} />);

    fireEvent.click(screen.getByRole('button', { name: /buy/i }));
    expect(onBuy).toHaveBeenCalledWith(item);
  });

  it('shows level requirement badge when level_requirement > 0', () => {
    const onBuy = vi.fn();
    render(
      <ItemCard item={makeItem({ level_requirement: 5 })} studentLevel={10} owned={false} onBuy={onBuy} />,
    );

    expect(screen.getByText('Level 5+')).toBeInTheDocument();
  });
});
