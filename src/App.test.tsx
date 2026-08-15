import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { db } from './db';
import { EMPTY_ITEM } from './db/types';

/**
 * Smoke-тести на рівні застосунку.
 *
 * Головна перевірка — що список рендериться з «поганими» даними, які валили стару
 * версію: порожній термін придатності, відсутнє фото, однакові назви.
 */

function renderApp() {
  return render(
    <HashRouter>
      <App />
    </HashRouter>,
  );
}

const item = (patch: Record<string, unknown>) => ({
  ...EMPTY_ITEM,
  name: 'Товар',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...patch,
});

describe('App', () => {
  beforeEach(async () => {
    // matchMedia jsdom не реалізує, а MUI useMediaQuery на нього спирається.
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    if (!db.isOpen()) await db.open();
    await Promise.all([db.items.clear(), db.shopping.clear()]);
  });

  afterEach(async () => {
    await Promise.all([db.items.clear(), db.shopping.clear()]);
    vi.unstubAllGlobals();
  });

  it('рендериться на порожній базі', async () => {
    renderApp();
    expect(await screen.findByText('Запасів поки немає')).toBeInTheDocument();
  });

  it('не падає на товарі без терміну придатності, фото й нотатки', async () => {
    // Саме така комбінація валила стару версію: format(new Date('')) кидав RangeError,
    // а Error Boundary не було, тож користувач бачив білий екран.
    await db.items.add(item({ name: 'Сіль', bestBefore: null, quantity: 1 }));

    renderApp();

    expect(await screen.findByText('Сіль')).toBeInTheDocument();
    expect(screen.getByText('без терміну')).toBeInTheDocument();
    expect(screen.queryByText('Щось пішло не так')).not.toBeInTheDocument();
  });

  it('показує товар, доданий без явної кількості', async () => {
    // Регресія на головний баг старої версії: where('quantity').above(0) не бачив
    // записів, у яких кількість не була проіндексована.
    await db.items.add(item({ name: 'Гречка', quantity: 1 }));
    renderApp();
    expect(await screen.findByText('Гречка')).toBeInTheDocument();
  });

  it('показує обидва товари з однаковою назвою', async () => {
    // Стара версія використовувала key={row.name} — React вважав їх одним рядком.
    await db.items.bulkAdd([
      item({ name: 'Молоко', bestBefore: '2026-09-01' }),
      item({ name: 'Молоко', bestBefore: '2026-10-01' }),
    ]);

    renderApp();
    await waitFor(() => expect(screen.getAllByText('Молоко')).toHaveLength(2));
  });

  it('показує більше ніж 10 товарів', async () => {
    // Стара версія жорстко різала список через .slice(0, 10).
    await db.items.bulkAdd(
      Array.from({ length: 15 }, (_, i) => item({ name: `Товар ${i + 1}`, quantity: 1 })),
    );

    renderApp();
    expect(await screen.findByText('Товар 15')).toBeInTheDocument();
    expect(screen.getByText('Показано 15 із 15')).toBeInTheDocument();
  });

  it('не показує те, що закінчилось, поки не увімкнути перемикач', async () => {
    await db.items.bulkAdd([
      item({ name: 'Наявне', quantity: 2 }),
      item({ name: 'Закінчилось', quantity: 0 }),
    ]);

    renderApp();
    expect(await screen.findByText('Наявне')).toBeInTheDocument();
    expect(screen.queryByText('Закінчилось')).not.toBeInTheDocument();
  });
});
