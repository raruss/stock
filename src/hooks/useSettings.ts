import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { DEFAULT_SETTINGS, type Settings } from '../db/types';
import { writeSettings } from '../db/settings';

/** Налаштування як live-запит: зміна теми одразу застосовується у всіх вкладках. */
export function useSettings(): [Settings, (patch: Partial<Settings>) => Promise<void>] {
  const row = useLiveQuery(() => db.settings.get('app'), []);
  const settings: Settings = { ...DEFAULT_SETTINGS, ...row?.value };
  const update = useCallback(async (patch: Partial<Settings>) => {
    await writeSettings(patch);
  }, []);
  return [settings, update];
}
