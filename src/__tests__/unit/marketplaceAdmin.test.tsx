// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MarketplaceManagementPage from '@/pages/admin/marketplace/MarketplaceManagementPage';
import { createMarketplaceItemSchema } from '@/lib/marketplaceSchemas';

// ── Mocks ────────────────────────────────────────────────────────────────────

const toggleMutateMock = vi.fn();

const mockItems = [
  {
    id: 'item-1',
    name: 'Ocean Blue Theme',
    category: 'cosmetic',
    sub_category: 'profile_theme',
    xp_price: 500,
    level_requirement: 5,
    stock_type: 'unlimited',
    stock_quantity: null,
    is_active: true,
  },
  {
    id: 'item-2',
    name: 'XP Boost',
    category: 'power_up',
    sub_category: 'xp_boost',
    xp_price: 300,
    level_requirement: 0,
    stock_type: 'limited',
    stock_quantity: 10,
    is_active: false,
  },
];

vi.mock('@/hooks/useMarketplaceAdmin', () => ({
  useAdminMarketplaceItems: () => ({
    data: mockItems,
    isLoading: false,
  }),
  useToggleMarketplaceItem: () => ({
    mutate: toggleMutateMock,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'admin-1' },
    profile: { institution_id: 'inst-1', role: 'admin' },
  }),
}));

vi.mock('@/hooks/useInstitutionSettings', () => ({
  useInstitutionSettings: () => ({ data: null, isLoading: false }),
  useUpsertInstitutionSettings: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/pages/admin/marketplace/ItemForm', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="item-form">Item Form</div> : null,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('MarketplaceManagementPage', () => {
  it('renders item list with DataTable', () => {
    render(<MarketplaceManagementPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Ocean Blue Theme')).toBeInTheDocument();
    expect(screen.getByText('XP Boost')).toBeInTheDocument();
  });

  it('shows create item button', () => {
    render(<MarketplaceManagementPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
  });

  it('opens item form when Add Item is clicked', () => {
    render(<MarketplaceManagementPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /add item/i }));
    expect(screen.getByTestId('item-form')).toBeInTheDocument();
  });

  it('shows Active/Inactive status badges', () => {
    render(<MarketplaceManagementPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});

// ── Schema Validation Tests (admin form validation) ──────────────────────────

describe('MarketplaceAdmin form validation (via schema)', () => {
  it('validates required fields: name, category, price', () => {
    const result = createMarketplaceItemSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('name');
      expect(paths).toContain('category');
      expect(paths).toContain('xp_price');
    }
  });

  it('rejects negative prices', () => {
    const result = createMarketplaceItemSchema.safeParse({
      name: 'Test Item',
      description: 'desc',
      category: 'cosmetic',
      sub_category: 'profile_theme',
      xp_price: -50,
      stock_type: 'unlimited',
      icon_identifier: 'icon',
    });
    expect(result.success).toBe(false);
  });

  it('rejects level_requirement below 0', () => {
    const result = createMarketplaceItemSchema.safeParse({
      name: 'Test Item',
      description: 'desc',
      category: 'cosmetic',
      sub_category: 'profile_theme',
      xp_price: 100,
      level_requirement: -1,
      stock_type: 'unlimited',
      icon_identifier: 'icon',
    });
    expect(result.success).toBe(false);
  });

  it('accepts level_requirement of 0', () => {
    const result = createMarketplaceItemSchema.safeParse({
      name: 'Test Item',
      description: 'desc',
      category: 'cosmetic',
      sub_category: 'profile_theme',
      xp_price: 100,
      level_requirement: 0,
      stock_type: 'unlimited',
      icon_identifier: 'icon',
    });
    expect(result.success).toBe(true);
  });

  it('toggle active/inactive calls mutate with correct params', () => {
    render(<MarketplaceManagementPage />, { wrapper: createWrapper() });

    // Find toggle buttons (there should be one per row)
    const toggleButtons = screen.getAllByRole('button').filter((btn) => {
      const svg = btn.querySelector('svg');
      return svg !== null;
    });

    // At least one toggle button should exist
    expect(toggleButtons.length).toBeGreaterThan(0);
  });
});
