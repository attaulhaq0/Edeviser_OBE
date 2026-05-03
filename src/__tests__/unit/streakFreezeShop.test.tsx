// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StreakFreezeShop, { FREEZE_COST, MAX_FREEZES } from '@/components/shared/StreakFreezeShop';

// Mock i18next for ConfirmDialog
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'buttons.cancel': 'Cancel',
        'buttons.confirm': 'Confirm',
      };
      return map[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

describe('StreakFreezeShop', () => {
  const defaultProps = {
    currentXP: 500,
    freezesAvailable: 0,
    onPurchase: vi.fn().mockResolvedValue(undefined),
  };

  it('renders freeze inventory icons', () => {
    render(<StreakFreezeShop {...defaultProps} freezesAvailable={1} />);
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('shows 0/3 when no freezes available', () => {
    render(<StreakFreezeShop {...defaultProps} freezesAvailable={0} />);
    expect(screen.getByText('0/3')).toBeInTheDocument();
  });

  it('shows 3/3 when max freezes available', () => {
    render(<StreakFreezeShop {...defaultProps} freezesAvailable={3} />);
    expect(screen.getByText('3/3')).toBeInTheDocument();
  });

  it('enables purchase button when XP >= 200 and freezes < 2', () => {
    render(<StreakFreezeShop {...defaultProps} currentXP={300} freezesAvailable={0} />);
    const btn = screen.getByRole('button', { name: /buy for 200 xp/i });
    expect(btn).not.toBeDisabled();
  });

  it('disables purchase button when XP < 200', () => {
    render(<StreakFreezeShop {...defaultProps} currentXP={100} freezesAvailable={0} />);
    const btn = screen.getByRole('button', { name: /buy for 200 xp/i });
    expect(btn).toBeDisabled();
  });

  it('disables purchase button when freezes >= 3', () => {
    render(<StreakFreezeShop {...defaultProps} currentXP={500} freezesAvailable={3} />);
    const btn = screen.getByRole('button', { name: /buy for 200 xp/i });
    expect(btn).toBeDisabled();
  });

  it('shows insufficient XP message when balance is low', () => {
    render(<StreakFreezeShop {...defaultProps} currentXP={50} />);
    expect(screen.getByText(/not enough xp/i)).toBeInTheDocument();
    expect(screen.getByText(/50\/200/)).toBeInTheDocument();
  });

  it('does not show insufficient XP message when balance is sufficient', () => {
    render(<StreakFreezeShop {...defaultProps} currentXP={300} />);
    expect(screen.queryByText(/not enough xp/i)).not.toBeInTheDocument();
  });

  it('shows confirmation dialog before purchase', async () => {
    render(<StreakFreezeShop {...defaultProps} />);
    const btn = screen.getByRole('button', { name: /buy for 200 xp/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/purchase streak freeze/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/deduct 200 xp/i)).toBeInTheDocument();
  });

  it('calls onPurchase after confirming dialog', async () => {
    const onPurchase = vi.fn().mockResolvedValue(undefined);
    render(<StreakFreezeShop {...defaultProps} onPurchase={onPurchase} />);

    fireEvent.click(screen.getByRole('button', { name: /buy for 200 xp/i }));

    await waitFor(() => {
      expect(screen.getByText(/purchase streak freeze/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /buy freeze/i }));

    await waitFor(() => {
      expect(onPurchase).toHaveBeenCalledTimes(1);
    });
  });

  it('does not call onPurchase when dialog is cancelled', async () => {
    const onPurchase = vi.fn().mockResolvedValue(undefined);
    render(<StreakFreezeShop {...defaultProps} onPurchase={onPurchase} />);

    fireEvent.click(screen.getByRole('button', { name: /buy for 200 xp/i }));

    await waitFor(() => {
      expect(screen.getByText(/purchase streak freeze/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onPurchase).not.toHaveBeenCalled();
  });

  it('exports FREEZE_COST and MAX_FREEZES constants', () => {
    expect(FREEZE_COST).toBe(200);
    expect(MAX_FREEZES).toBe(3);
  });
});
