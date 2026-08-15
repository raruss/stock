import type { Category, Location, Unit, ThemeMode } from '../db/types';

/**
 * Підписи українською.
 *
 * Значення в базі лишаються машинними ключами ('fridge', 'dairy'), а не текстом —
 * інакше перейменування підпису вимагало б міграції даних, а сортування залежало б
 * від мови інтерфейсу.
 */

export const LOCATION_LABELS: Record<Location, string> = {
  fridge: 'Холодильник',
  freezer: 'Морозилка',
  pantry: 'Комора',
  other: 'Інше',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  dairy: 'Молочне',
  meat: 'М’ясо і риба',
  vegetables: 'Овочі',
  fruits: 'Фрукти',
  grains: 'Крупи і борошно',
  drinks: 'Напої',
  frozen: 'Заморожене',
  sweets: 'Солодощі',
  canned: 'Консерви',
  household: 'Побутове',
  other: 'Інше',
};

export const UNIT_LABELS: Record<Unit, string> = {
  pcs: 'шт',
  kg: 'кг',
  g: 'г',
  l: 'л',
  ml: 'мл',
  pack: 'уп',
};

export const THEME_LABELS: Record<ThemeMode, string> = {
  light: 'Світла',
  dark: 'Темна',
  system: 'Як у системі',
};
