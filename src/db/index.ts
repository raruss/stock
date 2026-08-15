import Dexie, { type EntityTable, type Transaction } from 'dexie';
import type { Item, ShoppingEntry, Settings } from './types';

/**
 * Назва бази **не змінюється**.
 *
 * IndexedDB прив'язана до пари «origin + назва БД». Origin той самий, назва та сама —
 * отже, це та сама база, з усіма вже введеними товарами. Створення `new Dexie('stock-v2')`
 * або перейменування таблиці `items` означало б втрату всіх даних користувача.
 */
export const DB_NAME = 'stock';

export interface SettingsRow {
  key: 'app';
  value: Settings;
}

export const db = new Dexie(DB_NAME) as Dexie & {
  items: EntityTable<Item, 'id'>;
  shopping: EntityTable<ShoppingEntry, 'id'>;
  settings: EntityTable<SettingsRow, 'key'>;
};

/**
 * Версія 1 — схема, яка вже стоїть у браузерах користувачів.
 *
 * Її НЕ можна прибирати з коду: Dexie використовує ланцюжок версій, щоб зрозуміти,
 * з якого стану мігрувати. Без цього рядка база з v1 не знайде шляху до v2.
 */
db.version(1).stores({
  items: '++id, upc, bestBefore, name, image, quantity, created',
});

/**
 * Версія 2 — нова структура.
 *
 * Індекси на `image` та `quantity` прибрані свідомо:
 *  - `image` — індексувати URL немає сенсу, за ним ніколи не шукають;
 *  - `quantity` — саме через індексний запит `where('quantity').above(0)` товари з
 *    `quantity: undefined` взагалі не потрапляли у список. Тепер кількість фільтрується
 *    у пам'яті, де `undefined` і рядки поводяться передбачувано.
 *
 * Значення полів при цьому не втрачаються — прибираються лише індекси.
 */
db.version(2)
  .stores({
    items: '++id, upc, name, bestBefore, location, category, updatedAt',
    shopping: '++id, name, upc, done',
    settings: 'key',
  })
  .upgrade(migrateV1ToV2);

/**
 * Переносить записи зі старого формату в новий.
 *
 * Викликається Dexie автоматично й рівно один раз — при першому відкритті бази новою
 * версією застосунку. Жоден запис не видаляється; тільки нормалізуються типи та
 * дозаповнюються нові поля.
 */
export async function migrateV1ToV2(tx: Transaction): Promise<void> {
  await tx
    .table('items')
    .toCollection()
    .modify((raw: Record<string, unknown>) => {
      raw.quantity = normalizeQuantity(raw.quantity);
      raw.bestBefore = normalizeBestBefore(raw.bestBefore);
      raw.name = typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Без назви';
      raw.upc = typeof raw.upc === 'string' ? raw.upc : '';
      raw.unit = raw.unit ?? 'pcs';
      // Місце і категорія у старій схемі не існували, тож для наявних товарів вони
      // справді невідомі — 'other' чесніше за вигаданий «холодильник».
      raw.location = raw.location ?? 'other';
      raw.category = raw.category ?? 'other';
      raw.minQuantity = typeof raw.minQuantity === 'number' ? raw.minQuantity : 0;

      const created = toIsoString(raw.created) ?? new Date().toISOString();
      raw.createdAt = toIsoString(raw.createdAt) ?? created;
      raw.updatedAt = toIsoString(raw.updatedAt) ?? created;
      delete raw.created;

      if (typeof raw.image !== 'string' || !raw.image) delete raw.image;
    });
}

/**
 * Кількість у старій версії приходила з `<TextField type="number">` як **рядок**
 * ("2", "" або взагалі undefined, якщо поле не чіпали).
 *
 * Відсутню кількість трактуємо як 1, а не 0: користувач додав товар, отже мав його
 * принаймні в одному екземплярі. Записати 0 означало б сховати товар як «закінчився».
 */
export function normalizeQuantity(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 1;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 1;
}

/** Приводить дату до 'yyyy-MM-dd'; усе, що не є валідною датою, стає null. */
export function normalizeBestBefore(raw: unknown): string | null {
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : toDateKey(raw);
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
    if (match) {
      const probe = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
      return Number.isNaN(probe.getTime()) ? null : `${match[1]}-${match[2]}-${match[3]}`;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : toDateKey(parsed);
  }
  return null;
}

function toDateKey(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toIsoString(raw: unknown): string | null {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw.toISOString();
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
}
