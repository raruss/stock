import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Category, Item } from '../db/types';
import { suggestShelfLife, type ShelfLifeSuggestion } from '../utils/shelfLife';

/**
 * Підказка терміну зберігання для конкретного штрихкоду й категорії.
 *
 * Запит іде по індексу `upc`, тож коштує дешево навіть на великій базі. Порожній
 * штрихкод у базу не ходить узагалі — падаємо одразу на дефолт за категорією.
 */
export function useShelfLifeSuggestion(
  upc: string,
  category: Category,
): ShelfLifeSuggestion | null {
  const history = useLiveQuery<Item[]>(
    () => (upc ? db.items.where('upc').equals(upc).toArray() : Promise.resolve<Item[]>([])),
    [upc],
  );

  return useMemo(() => suggestShelfLife(category, history ?? []), [category, history]);
}
