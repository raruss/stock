import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import Dexie from 'dexie';
import { migrateV1ToV2, normalizeBestBefore, normalizeQuantity } from './index';
import type { Item } from './types';

/**
 * Найважливіші тести в проєкті: вони доводять, що перехід на нову структуру
 * не втрачає вже введених користувачем товарів.
 *
 * Записи в `V1_FIXTURE` відтворюють реальні форми даних, які могла створити стара
 * версія — з усіма її дефектами.
 */

const V1_FIXTURE: Array<Record<string, unknown>> = [
  // Типовий запис зі сканування: кількість — рядок, бо приходила з <input type=number>.
  {
    upc: '4823063113847',
    name: 'Молоко 2.5%',
    image: 'https://images.openfoodfacts.org/x.jpg',
    quantity: '2',
    bestBefore: '2026-09-01',
    created: new Date('2026-08-01T10:00:00Z'),
  },
  // Доданий вручну: кількість не чіпали взагалі — саме такі товари стара версія
  // ніколи не показувала у списку.
  { upc: '', name: 'Гречка', bestBefore: '2027-01-15', created: new Date('2026-08-02T10:00:00Z') },
  // Порожній термін — саме він валив застосунок через format(new Date('')).
  { upc: '', name: 'Сіль', quantity: '1', bestBefore: '', created: new Date('2026-08-03T10:00:00Z') },
  // Кількість нуль рядком: справжній нуль, а не «поле не заповнили».
  { upc: '1234567890128', name: 'Кава', quantity: '0', bestBefore: '2026-12-31', created: new Date() },
  // Запис без назви взагалі.
  { upc: '', quantity: 3, bestBefore: null, created: new Date() },
];

const DB_NAME = 'stock-migration-test';

async function seedV1(): Promise<void> {
  const legacy = new Dexie(DB_NAME);
  legacy.version(1).stores({ items: '++id, upc, bestBefore, name, image, quantity, created' });
  await legacy.open();
  await legacy.table('items').bulkAdd(V1_FIXTURE);
  legacy.close();
}

async function openV2() {
  const next = new Dexie(DB_NAME);
  next.version(1).stores({ items: '++id, upc, bestBefore, name, image, quantity, created' });
  next
    .version(2)
    .stores({
      items: '++id, upc, name, bestBefore, location, category, updatedAt',
      shopping: '++id, name, upc, done',
      settings: 'key',
    })
    .upgrade(migrateV1ToV2);
  await next.open();
  return next;
}

describe('міграція v1 → v2', () => {
  beforeEach(seedV1);
  afterEach(async () => {
    await Dexie.delete(DB_NAME);
  });

  it('не втрачає жодного запису', async () => {
    const db = await openV2();
    const items = await db.table<Item>('items').toArray();
    expect(items).toHaveLength(V1_FIXTURE.length);
    db.close();
  });

  it('перетворює рядкову кількість на число', async () => {
    const db = await openV2();
    const milk = await db.table<Item>('items').where('name').equals('Молоко 2.5%').first();
    expect(milk?.quantity).toBe(2);
    expect(typeof milk?.quantity).toBe('number');
    db.close();
  });

  it('відсутню кількість трактує як 1, щоб товар не зник зі списку', async () => {
    const db = await openV2();
    const buckwheat = await db.table<Item>('items').where('name').equals('Гречка').first();
    expect(buckwheat?.quantity).toBe(1);
    db.close();
  });

  it('справжній нуль лишає нулем', async () => {
    const db = await openV2();
    const coffee = await db.table<Item>('items').where('name').equals('Кава').first();
    expect(coffee?.quantity).toBe(0);
    db.close();
  });

  it('порожній термін придатності стає null, а не порожнім рядком', async () => {
    const db = await openV2();
    const salt = await db.table<Item>('items').where('name').equals('Сіль').first();
    expect(salt?.bestBefore).toBeNull();
    db.close();
  });

  it('зберігає назву, штрихкод і фото', async () => {
    const db = await openV2();
    const milk = await db.table<Item>('items').where('upc').equals('4823063113847').first();
    expect(milk?.name).toBe('Молоко 2.5%');
    expect(milk?.image).toBe('https://images.openfoodfacts.org/x.jpg');
    expect(milk?.bestBefore).toBe('2026-09-01');
    db.close();
  });

  it('дозаповнює нові поля дефолтами і переносить дату створення', async () => {
    const db = await openV2();
    const items = await db.table<Item>('items').toArray();
    for (const item of items) {
      expect(item.location).toBeDefined();
      expect(item.category).toBeDefined();
      expect(item.unit).toBe('pcs');
      expect(item.minQuantity).toBe(0);
      expect(() => new Date(item.createdAt).toISOString()).not.toThrow();
      expect((item as unknown as Record<string, unknown>).created).toBeUndefined();
    }
    const milk = items.find((i) => i.name === 'Молоко 2.5%');
    expect(milk?.createdAt).toBe('2026-08-01T10:00:00.000Z');
    db.close();
  });

  it('запис без назви отримує заглушку замість undefined', async () => {
    const db = await openV2();
    const nameless = await db.table<Item>('items').where('name').equals('Без назви').first();
    expect(nameless?.quantity).toBe(3);
    db.close();
  });

  it('міграція ідемпотентна: повторне відкриття нічого не псує', async () => {
    const first = await openV2();
    const before = await first.table<Item>('items').toArray();
    first.close();

    const second = await openV2();
    const after = await second.table<Item>('items').toArray();
    second.close();

    expect(after).toEqual(before);
  });
});

describe('normalizeQuantity', () => {
  it.each([
    ['2', 2],
    ['0', 0],
    [0, 0],
    [3.5, 3.5],
    ['', 1],
    [undefined, 1],
    [null, 1],
    ['абв', 1],
    [NaN, 1],
  ])('%o → %o', (input, expected) => {
    expect(normalizeQuantity(input)).toBe(expected);
  });
});

describe('normalizeBestBefore', () => {
  it.each([
    ['2026-09-01', '2026-09-01'],
    ['2026-09-01T00:00:00.000Z', '2026-09-01'],
    ['', null],
    [undefined, null],
    [null, null],
    ['не дата', null],
  ])('%o → %o', (input, expected) => {
    expect(normalizeBestBefore(input)).toBe(expected);
  });

  it('приймає об’єкт Date', () => {
    expect(normalizeBestBefore(new Date(2026, 8, 1))).toBe('2026-09-01');
  });

  it('невалідний Date не кидає, а дає null', () => {
    expect(normalizeBestBefore(new Date('нісенітниця'))).toBeNull();
  });
});
