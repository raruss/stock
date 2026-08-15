import { db } from './index';
import type { Item } from './types';

export type ItemDraft = Omit<Item, 'id' | 'createdAt' | 'updatedAt'>;

const now = () => new Date().toISOString();

/**
 * Усі функції репозиторію **кидають** помилку, а не ковтають її в `alert()`, як робила
 * стара `src/db.js`. Виклик обгортається в `useToast().run()`, який показує Snackbar.
 */

export async function addItem(draft: ItemDraft): Promise<number> {
  const ts = now();
  return db.items.add({ ...draft, createdAt: ts, updatedAt: ts });
}

export async function updateItem(id: number, patch: Partial<ItemDraft>): Promise<void> {
  await db.items.update(id, { ...patch, updatedAt: now() });
}

export async function deleteItem(id: number): Promise<void> {
  await db.items.delete(id);
}

/** Змінює кількість на delta, не даючи піти в мінус. Повертає нову кількість. */
export async function adjustQuantity(id: number, delta: number): Promise<number> {
  return db.transaction('rw', db.items, async () => {
    const item = await db.items.get(id);
    if (!item) throw new Error(`Товар #${id} не знайдено`);
    const next = Math.max(0, roundQuantity(item.quantity + delta));
    await db.items.update(id, { quantity: next, updatedAt: now() });
    return next;
  });
}

export async function findByUpc(upc: string): Promise<Item | undefined> {
  if (!upc) return undefined;
  return db.items.where('upc').equals(upc).first();
}

/**
 * Додає товар або, якщо такий штрихкод уже є, збільшує кількість наявного.
 *
 * Стара версія створювала дубль на кожне сканування — при повторній покупці того самого
 * продукту список забивався однаковими рядками.
 */
export async function addOrIncrement(
  draft: ItemDraft,
): Promise<{ id: number; merged: boolean }> {
  return db.transaction('rw', db.items, async () => {
    const existing = draft.upc ? await findByUpc(draft.upc) : undefined;

    // Зливаємо лише товари з однаковим терміном придатності: дві пачки молока
    // з різними датами — це справді два різні записи.
    if (existing && existing.bestBefore === draft.bestBefore) {
      const quantity = roundQuantity(existing.quantity + draft.quantity);
      await db.items.update(existing.id, { quantity, updatedAt: now() });
      return { id: existing.id, merged: true };
    }

    const ts = now();
    const id = await db.items.add({ ...draft, createdAt: ts, updatedAt: ts });
    return { id, merged: false };
  });
}

/** Прибирає хвости плаваючої коми на кшталт 0.1 + 0.2 = 0.30000000000000004. */
function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}
