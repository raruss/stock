import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Item, Location, Category } from '../db/types';
import { compareByExpiry, expiryStatus, type ExpiryStatus } from '../utils/dates';

export type SortKey = 'expiry' | 'name' | 'added' | 'quantity';

export interface ItemFilters {
  search: string;
  location: Location | 'all';
  category: Category | 'all';
  showOutOfStock: boolean;
  sort: SortKey;
}

export const DEFAULT_FILTERS: ItemFilters = {
  search: '',
  location: 'all',
  category: 'all',
  showOutOfStock: false,
  sort: 'expiry',
};

export interface ItemsView {
  all: Item[] | undefined;
  visible: Item[];
  expiring: Item[];
  outOfStockCount: number;
  loading: boolean;
}

/**
 * Читає товари й застосовує фільтри/сортування **у пам'яті**.
 *
 * Стара версія робила `db.items.where('quantity').above(0)`. Індексний запит пропускав
 * записи, у яких `quantity` — `undefined`, і порівнював рядок "0" з числом 0 за
 * правилами IndexedDB (числа завжди менші за рядки), тож "0" вважався більшим за нуль.
 * Для кількох сотень позицій вибірка в пам'яті і швидша, і передбачувана.
 */
export function useItems(
  filters: ItemFilters,
  criticalDays: number,
  warningDays: number,
): ItemsView {
  const all = useLiveQuery(() => db.items.toArray(), []);

  return useMemo(() => {
    const items = all ?? [];
    const query = filters.search.trim().toLowerCase();

    const visible = items
      .filter((item) => (filters.showOutOfStock ? true : item.quantity > 0))
      .filter((item) => filters.location === 'all' || item.location === filters.location)
      .filter((item) => filters.category === 'all' || item.category === filters.category)
      .filter(
        (item) =>
          !query ||
          item.name.toLowerCase().includes(query) ||
          item.upc.includes(query) ||
          (item.note?.toLowerCase().includes(query) ?? false),
      )
      .sort(sorters[filters.sort]);

    const expiring = items
      .filter((item) => item.quantity > 0)
      .filter((item) => URGENT.has(expiryStatus(item.bestBefore, criticalDays, warningDays)))
      .sort(compareByExpiry);

    return {
      all,
      visible,
      expiring,
      outOfStockCount: items.filter((item) => item.quantity <= 0).length,
      loading: all === undefined,
    };
  }, [all, filters, criticalDays, warningDays]);
}

const URGENT = new Set<ExpiryStatus>(['expired', 'critical', 'soon']);

const sorters: Record<SortKey, (a: Item, b: Item) => number> = {
  expiry: compareByExpiry,
  name: (a, b) => a.name.localeCompare(b.name, 'uk'),
  quantity: (a, b) => a.quantity - b.quantity,
  added: (a, b) => (a.createdAt < b.createdAt ? 1 : -1),
};
