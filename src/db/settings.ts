import { db } from './index';
import { DEFAULT_SETTINGS, type Settings } from './types';

export async function readSettings(): Promise<Settings> {
  const row = await db.settings.get('app');
  // Розгортаємо поверх дефолтів, щоб нові поля з'являлися у старих користувачів
  // самі собою, без окремої міграції на кожну галочку в налаштуваннях.
  return { ...DEFAULT_SETTINGS, ...row?.value };
}

export async function writeSettings(patch: Partial<Settings>): Promise<void> {
  const current = await readSettings();
  await db.settings.put({ key: 'app', value: { ...current, ...patch } });
}
