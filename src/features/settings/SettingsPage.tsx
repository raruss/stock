import { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';

import { THEME_LABELS } from '../../i18n';
import type { Settings, ThemeMode } from '../../db/types';
import {
  applyBackup,
  exportCsv,
  exportJson,
  parseBackup,
  type Backup,
  type ImportPreview,
} from '../../db/backup';
import { requestNotificationPermission } from '../../hooks/useExpiryNotifications';
import { useToast } from '../../components/ToastProvider';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatDate } from '../../utils/dates';

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => Promise<void>;
}

export function SettingsPage({ settings, onChange }: Props) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<{ backup: Backup; preview: ImportPreview } | null>(null);
  const [mode, setMode] = useState<'replace' | 'merge'>('merge');

  const handleNotifications = async (enabled: boolean) => {
    if (!enabled) {
      await onChange({ notificationsEnabled: false });
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) {
      toast.notify('Браузер не дав дозволу на сповіщення', 'warning');
      return;
    }
    await onChange({ notificationsEnabled: true });
  };

  const handleFile = async (file: File) => {
    try {
      // Спершу лише розбираємо і показуємо цифри — базу не чіпаємо, поки користувач
      // не підтвердить. Імпорт — єдина операція, здатна знищити дані.
      setStaged(parseBackup(await file.text()));
    } catch (error) {
      toast.notify(error instanceof Error ? error.message : 'Не вдалося прочитати файл', 'error');
    }
  };

  const applyStaged = async () => {
    if (!staged) return;
    const { backup } = staged;
    setStaged(null);
    await toast.run(() => applyBackup(backup, mode), 'Дані відновлено');
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Вигляд
          </Typography>
          <TextField
            select
            fullWidth
            label="Тема"
            value={settings.themeMode}
            onChange={(e) => void onChange({ themeMode: e.target.value as ThemeMode })}
          >
            {(Object.keys(THEME_LABELS) as ThemeMode[]).map((key) => (
              <MenuItem key={key} value={key}>
                {THEME_LABELS[key]}
              </MenuItem>
            ))}
          </TextField>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Терміни придатності
          </Typography>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                type="number"
                label="«Критично» — за скільки днів"
                value={settings.expiryCriticalDays}
                onChange={(e) =>
                  void onChange({ expiryCriticalDays: Math.max(0, Number(e.target.value) || 0) })
                }
                inputProps={{ min: 0, max: 90 }}
              />
              <TextField
                fullWidth
                type="number"
                label="«Спливає» — за скільки днів"
                value={settings.expiryWarningDays}
                onChange={(e) =>
                  void onChange({ expiryWarningDays: Math.max(0, Number(e.target.value) || 0) })
                }
                inputProps={{ min: 0, max: 365 }}
              />
            </Stack>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.notificationsEnabled}
                  onChange={(e) => void handleNotifications(e.target.checked)}
                />
              }
              label="Сповіщення про терміни"
            />
            <Alert severity="info" variant="outlined">
              Сповіщення приходять, коли ви відкриваєте застосунок, — не частіше разу на добу.
              Надсилати їх у фоні, коли застосунок закритий, без сервера технічно неможливо:
              для цього потрібен push-сервіс. Бейдж із кількістю термінових товарів на
              іконці працює завжди.
            </Alert>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Резервна копія
          </Typography>
          <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
            Дані зберігаються лише у вашому браузері. Очищення історії та даних сайтів
            видалить їх без можливості відновлення — робіть експорт час від часу.
            {settings.lastBackupAt && (
              <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                Останній експорт: {formatDate(settings.lastBackupAt.slice(0, 10))}
              </Box>
            )}
          </Alert>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => void toast.run(() => exportJson(), 'Копію збережено')}
            >
              Експорт JSON
            </Button>
            <Button
              variant="outlined"
              startIcon={<TableChartOutlinedIcon />}
              onClick={() => void toast.run(() => exportCsv())}
            >
              Експорт CSV
            </Button>
            <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => fileRef.current?.click()}>
              Імпорт
            </Button>
          </Stack>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />

          <Divider sx={{ my: 2 }} />
          <TextField
            select
            fullWidth
            label="Режим імпорту"
            value={mode}
            onChange={(e) => setMode(e.target.value as 'replace' | 'merge')}
          >
            <MenuItem value="merge">Доповнити наявні дані</MenuItem>
            <MenuItem value="replace">Замінити все вмістом файлу</MenuItem>
          </TextField>
        </Paper>
      </Stack>

      <ConfirmDialog
        open={staged !== null}
        title="Відновити з копії?"
        message={
          staged
            ? `У файлі: ${staged.preview.items} товар(ів), ${staged.preview.shopping} позиц(ій) у списку покупок.\n\n` +
              (mode === 'replace'
                ? 'Режим «замінити»: усі поточні дані будуть видалені й замінені вмістом файлу.'
                : 'Режим «доповнити»: записи з файлу додадуться до наявних. Можливі дублікати.')
            : ''
        }
        confirmLabel={mode === 'replace' ? 'Замінити все' : 'Доповнити'}
        destructive={mode === 'replace'}
        onConfirm={() => void applyStaged()}
        onCancel={() => setStaged(null)}
      />
    </Box>
  );
}
