import { db } from './index';
import type { Item, ShoppingEntry } from './types';

const now = () => new Date().toISOString();

export async function addShoppingEntry(
  entry: Omit<ShoppingEntry, 'id' | 'createdAt' | 'done'> & { done?: 0 | 1 },
): Promise<number> {
  return db.shopping.add({ done: 0, ...entry, createdAt: now() });
}

export async function setShoppingDone(id: number, done: boolean): Promise<void> {
  await db.shopping.update(id, { done: done ? 1 : 0 });
}

export async function deleteShoppingEntry(id: number): Promise<void> {
  await db.shopping.delete(id);
}

export async function clearDoneShopping(): Promise<number> {
  return db.shopping.where('done').equals(1).delete();
}

/**
 * Товари, які варто докупити: закінчились або впали нижче власного порога.
 *
 * Позиції, вже присутні у списку покупок, відсіюються — інакше кожен закінчений товар
 * висів би у двох місцях одночасно.
 */
export function suggestRestock(items: Item[], entries: ShoppingEntry[]): Item[] {
  const alreadyListed = new Set(
    entries.map((e) => e.sourceItemId).filter((id): id is number => id != null),
  );
  return items
    .filter((item) => item.id != null && !alreadyListed.has(item.id))
    .filter((item) => item.quantity <= 0 || item.quantity < item.minQuantity)
    .sort((a, b) => a.name.localeCompare(b.name, 'uk'));
}
