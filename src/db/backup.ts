import { db } from './index';
import { normalizeBestBefore, normalizeQuantity } from './index';
import { readSettings, writeSettings } from './settings';
import { toCsv, downloadFile } from '../utils/csv';
import { formatDate } from '../utils/dates';
import type { Item, ShoppingEntry, Settings } from './types';

export const BACKUP_FORMAT = 2;

export interface Backup {
  format: number;
  exportedAt: string;
  items: Item[];
  shopping: ShoppingEntry[];
  settings: Settings;
}

export async function buildBackup(): Promise<Backup> {
  const [items, shopping, settings] = await Promise.all([
    db.items.toArray(),
    db.shopping.toArray(),
    readSettings(),
  ]);
  return { format: BACKUP_FORMAT, exportedAt: new Date().toISOString(), items, shopping, settings };
}

export async function exportJson(): Promise<void> {
  const backup = await buildBackup();
  downloadFile(
    `zapasy-${backup.exportedAt.slice(0, 10)}.json`,
    JSON.stringify(backup, null, 2),
    'application/json',
  );
  await writeSettings({ lastBackupAt: backup.exportedAt });
}

export async function exportCsv(): Promise<void> {
  const items = await db.items.toArray();
  const rows = items.map((item) => ({
    Назва: item.name,
    Кількість: item.quantity,
    Одиниця: item.unit,
    'Термін придатності': formatDate(item.bestBefore, ''),
    Місце: item.location,
    Категорія: item.category,
    Штрихкод: item.upc,
    Нотатка: item.note ?? '',
  }));
  const columns = Object.keys(rows[0] ?? { Назва: '' });
  downloadFile(`zapasy-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows, columns), 'text/csv');
}

export interface ImportPreview {
  items: number;
  shopping: number;
  hasSettings: boolean;
}

/**
 * Розбирає файл бекапу і повідомляє, що в ньому, **не змінюючи базу**.
 *
 * Імпорт — єдина операція, яка може знищити дані, тож користувач має побачити цифри
 * до того, як щось станеться.
 */
export function parseBackup(text: string): { backup: Backup; preview: ImportPreview } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Файл не є коректним JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || !Array.isArray((parsed as Backup).items)) {
    throw new Error('Це не файл резервної копії «Запасів»');
  }
  const raw = parsed as Partial<Backup>;
  const backup: Backup = {
    format: raw.format ?? 1,
    exportedAt: raw.exportedAt ?? new Date().toISOString(),
    items: (raw.items ?? []).map(sanitizeItem),
    shopping: raw.shopping ?? [],
    settings: raw.settings as Settings,
  };
  return {
    backup,
    preview: {
      items: backup.items.length,
      shopping: backup.shopping.length,
      hasSettings: Boolean(raw.settings),
    },
  };
}

/**
 * @param mode 'replace' — стерти наявне й покласти з файлу; 'merge' — дописати поверх.
 */
export async function applyBackup(backup: Backup, mode: 'replace' | 'merge'): Promise<void> {
  await db.transaction('rw', db.items, db.shopping, db.settings, async () => {
    if (mode === 'replace') {
      await Promise.all([db.items.clear(), db.shopping.clear()]);
      await db.items.bulkAdd(backup.items);
      await db.shopping.bulkAdd(backup.shopping);
    } else {
      // При злитті id відкидаємо, щоб не перетерти наявні записи чужими ключами.
      await db.items.bulkAdd(backup.items.map(({ id: _id, ...rest }) => rest as Item));
      await db.shopping.bulkAdd(
        backup.shopping.map(({ id: _id, ...rest }) => rest as ShoppingEntry),
      );
    }
    if (backup.settings) await db.settings.put({ key: 'app', value: backup.settings });
  });
}

/** Той самий набір правил, що й у міграції v1→v2 — файл може бути зі старої версії. */
function sanitizeItem(raw: Partial<Item>): Item {
  const ts = new Date().toISOString();
  return {
    ...raw,
    upc: raw.upc ?? '',
    name: raw.name?.trim() || 'Без назви',
    quantity: normalizeQuantity(raw.quantity),
    unit: raw.unit ?? 'pcs',
    bestBefore: normalizeBestBefore(raw.bestBefore),
    location: raw.location ?? 'other',
    category: raw.category ?? 'other',
    minQuantity: typeof raw.minQuantity === 'number' ? raw.minQuantity : 0,
    createdAt: raw.createdAt ?? ts,
    updatedAt: raw.updatedAt ?? ts,
  } as Item;
}
