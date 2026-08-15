import { useCallback, useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { CssBaseline, useMediaQuery } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from './db';
import { buildTheme } from './theme';
import { useSettings } from './hooks/useSettings';
import { useExpiryNotifications } from './hooks/useExpiryNotifications';
import { suggestRestock } from './db/shopping';
import { AppShell } from './components/AppShell';
import { ToastProvider } from './components/ToastProvider';
import { UpdatePrompt } from './components/UpdatePrompt';
import { InventoryPage } from './features/inventory/InventoryPage';
import { ShoppingPage } from './features/shopping/ShoppingPage';
import { SettingsPage } from './features/settings/SettingsPage';

const TITLES: Record<string, string> = {
  '/': 'Запаси',
  '/shopping': 'Список покупок',
  '/settings': 'Налаштування',
};

export default function App() {
  const [settings, updateSettings] = useSettings();
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = useMemo(() => {
    const mode = settings.themeMode === 'system' ? (prefersDark ? 'dark' : 'light') : settings.themeMode;
    return buildTheme(mode);
  }, [settings.themeMode, prefersDark]);

  const items = useLiveQuery(() => db.items.toArray(), []);
  const entries = useLiveQuery(() => db.shopping.toArray(), []);

  const onNotified = useCallback(
    (isoDate: string) => void updateSettings({ lastNotifiedAt: isoDate }),
    [updateSettings],
  );
  useExpiryNotifications(items, settings, onNotified);

  const shoppingBadge =
    (entries ?? []).filter((e) => !e.done).length + suggestRestock(items ?? [], entries ?? []).length;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
        <Routes>
          {(['/', '/shopping', '/settings'] as const).map((path) => (
            <Route
              key={path}
              path={path}
              element={
                <AppShell title={TITLES[path]!} shoppingBadge={shoppingBadge}>
                  {path === '/' && <InventoryPage settings={settings} />}
                  {path === '/shopping' && <ShoppingPage />}
                  {path === '/settings' && (
                    <SettingsPage settings={settings} onChange={updateSettings} />
                  )}
                </AppShell>
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <UpdatePrompt />
      </ToastProvider>
    </ThemeProvider>
  );
}
