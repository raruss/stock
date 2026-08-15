import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpiryQuickPicker } from './ExpiryQuickPicker';
import { db } from '../../db';
import { EMPTY_ITEM } from '../../db/types';

describe('ExpiryQuickPicker', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0)); // 15 серпня 2026
    if (!db.isOpen()) await db.open();
    await db.items.clear();
  });

  afterEach(async () => {
    await db.items.clear();
    vi.useRealTimers();
  });

  it('пресет виставляє дату від сьогодні', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onChange = vi.fn();

    render(<ExpiryQuickPicker value={null} upc="" category="other" onChange={onChange} />);
    await user.click(await screen.findByText('+тиждень'));

    expect(onChange).toHaveBeenCalledWith('2026-08-22');
  });

  it('для категорії без історії пропонує типовий термін', async () => {
    const onChange = vi.fn();
    render(<ExpiryQuickPicker value={null} upc="" category="dairy" onChange={onChange} />);

    // Молочне — 7 днів за замовчуванням.
    expect(await screen.findByText('Зазвичай тиждень')).toBeInTheDocument();
  });

  it('для категорії, що не псується, підказки немає', async () => {
    render(<ExpiryQuickPicker value={null} upc="" category="household" onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('+3 дні')).toBeInTheDocument());
    expect(screen.queryByText(/Зазвичай/)).not.toBeInTheDocument();
  });

  it('історія покупок цього штрихкоду перебиває дефолт категорії', async () => {
    // Двічі купували те саме молоко, щоразу з терміном на 5 днів.
    await db.items.bulkAdd([
      {
        ...EMPTY_ITEM,
        upc: '111',
        name: 'Молоко',
        category: 'dairy',
        bestBefore: '2026-08-06',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
      {
        ...EMPTY_ITEM,
        upc: '111',
        name: 'Молоко',
        category: 'dairy',
        bestBefore: '2026-08-15',
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      },
    ]);

    render(<ExpiryQuickPicker value={null} upc="111" category="dairy" onChange={vi.fn()} />);

    // 5 днів з історії, а не 7 за категорією.
    expect(await screen.findByText('Зазвичай 5 дн.')).toBeInTheDocument();
  });

  it('дозволяє прибрати вже вибраний термін', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onChange = vi.fn();

    render(<ExpiryQuickPicker value="2026-09-01" upc="" category="other" onChange={onChange} />);
    await user.click(await screen.findByText('без терміну'));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
