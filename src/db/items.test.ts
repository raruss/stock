import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import Dexie from 'dexie';
import { db } from './index';
import { addItem, addOrIncrement, adjustQuantity, deleteItem, findByUpc } from './items';
import { EMPTY_ITEM } from './types';
import { suggestRestock } from './shopping';
import type { Item } from './types';

const draft = (patch: Partial<Item> = {}) => ({ ...EMPTY_ITEM, name: 'Товар', ...patch });

describe('репозиторій товарів', () => {
  beforeEach(async () => {
    if (!db.isOpen()) await db.open();
    await db.items.clear();
  });
  afterEach(async () => {
    await db.items.clear();
  });

  it('додає товар і проставляє часові мітки', async () => {
    const id = await addItem(draft({ name: 'Молоко', quantity: 2 }));
    const saved = await db.items.get(id);
    expect(saved?.name).toBe('Молоко');
    expect(saved?.createdAt).toBeTruthy();
    expect(saved?.updatedAt).toBeTruthy();
  });

  it('adjustQuantity не пускає кількість у мінус', async () => {
    const id = await addItem(draft({ quantity: 1 }));
    expect(await adjustQuantity(id, -1)).toBe(0);
    expect(await adjustQuantity(id, -1)).toBe(0);
  });

  it('adjustQuantity не лишає хвостів плаваючої коми', async () => {
    const id = await addItem(draft({ quantity: 0.1, unit: 'kg' }));
    expect(await adjustQuantity(id, 0.2)).toBe(0.3);
  });

  it('adjustQuantity кидає на неіснуючому товарі', async () => {
    await expect(adjustQuantity(99999, 1)).rejects.toThrow();
  });

  it('повторне додавання того самого штрихкоду і терміну збільшує кількість', async () => {
    await addOrIncrement(draft({ upc: '111', quantity: 1, bestBefore: '2026-09-01' }));
    const second = await addOrIncrement(draft({ upc: '111', quantity: 2, bestBefore: '2026-09-01' }));

    expect(second.merged).toBe(true);
    expect(await db.items.count()).toBe(1);
    expect((await findByUpc('111'))?.quantity).toBe(3);
  });

  it('той самий штрихкод з іншим терміном — це окремий запис', async () => {
    await addOrIncrement(draft({ upc: '111', bestBefore: '2026-09-01' }));
    const second = await addOrIncrement(draft({ upc: '111', bestBefore: '2026-10-01' }));

    expect(second.merged).toBe(false);
    expect(await db.items.count()).toBe(2);
  });

  it('товари без штрихкоду ніколи не зливаються між собою', async () => {
    await addOrIncrement(draft({ upc: '', name: 'Гречка' }));
    await addOrIncrement(draft({ upc: '', name: 'Гречка' }));
    expect(await db.items.count()).toBe(2);
  });

  it('видаляє товар', async () => {
    const id = await addItem(draft());
    await deleteItem(id);
    expect(await db.items.get(id)).toBeUndefined();
  });
});

describe('suggestRestock', () => {
  const item = (patch: Partial<Item>): Item =>
    ({ ...EMPTY_ITEM, id: 1, name: 'X', createdAt: '', updatedAt: '', ...patch }) as Item;

  it('пропонує те, що закінчилось', () => {
    expect(suggestRestock([item({ id: 1, quantity: 0 })], [])).toHaveLength(1);
  });

  it('пропонує те, що впало нижче мінімуму', () => {
    expect(suggestRestock([item({ id: 1, quantity: 1, minQuantity: 3 })], [])).toHaveLength(1);
  });

  it('не пропонує те, чого достатньо', () => {
    expect(suggestRestock([item({ id: 1, quantity: 5, minQuantity: 3 })], [])).toHaveLength(0);
  });

  it('не пропонує вдруге те, що вже у списку покупок', () => {
    const entries = [
      { id: 9, name: 'X', upc: '', quantity: 1, unit: 'pcs' as const, done: 0 as const, sourceItemId: 1, createdAt: '' },
    ];
    expect(suggestRestock([item({ id: 1, quantity: 0 })], entries)).toHaveLength(0);
  });
});

afterEach(async () => {
  await Dexie.waitFor(Promise.resolve());
});
