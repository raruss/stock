/** Місце зберігання товару. */
export const LOCATIONS = ['fridge', 'freezer', 'pantry', 'other'] as const;
export type Location = (typeof LOCATIONS)[number];

/** Категорія товару. */
export const CATEGORIES = [
  'dairy',
  'meat',
  'vegetables',
  'fruits',
  'grains',
  'drinks',
  'frozen',
  'sweets',
  'canned',
  'household',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Одиниця виміру. */
export const UNITS = ['pcs', 'kg', 'g', 'l', 'ml', 'pack'] as const;
export type Unit = (typeof UNITS)[number];

export interface Item {
  /**
   * Обов'язковий у типі, але при вставці не вказується: Dexie сам виводить
   * `InsertType`, у якому автоінкрементний ключ необов'язковий.
   */
  id: number;
  /** Штрихкод. Порожній рядок, якщо товар доданий вручну. */
  upc: string;
  name: string;
  /** URL фото з OpenFoodFacts або data-URI зі знімка камери. */
  image?: string;
  quantity: number;
  unit: Unit;
  /**
   * Термін придатності у форматі 'yyyy-MM-dd' — саме рядок, а не Date.
   *
   * Термін придатності — це календарний день, а не момент часу. `new Date('2026-01-15')`
   * парситься як UTC-північ, тож у від'ємних таймзонах показував би 14 січня.
   * `null` — валідне значення: не всі товари мають термін.
   */
  bestBefore: string | null;
  location: Location;
  category: Category;
  /** Поріг, нижче якого товар автоматично пропонується у список покупок. */
  minQuantity: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingEntry {
  id: number;
  name: string;
  upc: string;
  quantity: number;
  unit: Unit;
  done: 0 | 1;
  /** Заповнено, якщо запис створено автоматично із залишків. */
  sourceItemId?: number;
  createdAt: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Settings {
  /** Скільки днів до кінця терміну вважати «спливає». */
  expiryWarningDays: number;
  /** Скільки днів до кінця терміну вважати «критично». */
  expiryCriticalDays: number;
  themeMode: ThemeMode;
  notificationsEnabled: boolean;
  /** ISO-дата останньої показаної нотифікації — щоб не спамити щодня по кілька разів. */
  lastNotifiedAt: string | null;
  /** ISO-дата останнього експорту — для нагадування про бекап. */
  lastBackupAt: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  expiryWarningDays: 7,
  expiryCriticalDays: 3,
  themeMode: 'system',
  notificationsEnabled: false,
  lastNotifiedAt: null,
  lastBackupAt: null,
};

/** Початкові значення форми нового товару. */
export const EMPTY_ITEM: Omit<Item, 'id' | 'createdAt' | 'updatedAt'> = {
  upc: '',
  name: '',
  quantity: 1,
  unit: 'pcs',
  bestBefore: null,
  location: 'fridge',
  category: 'other',
  minQuantity: 0,
};
