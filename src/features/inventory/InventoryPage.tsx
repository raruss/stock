import { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  Fab,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import AddIcon from '@mui/icons-material/Add';
import TuneIcon from '@mui/icons-material/Tune';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SearchOffIcon from '@mui/icons-material/SearchOff';

import { CATEGORIES, LOCATIONS, type Item, type Settings } from '../../db/types';
import { CATEGORY_LABELS, LOCATION_LABELS } from '../../i18n';
import { addOrIncrement, adjustQuantity, deleteItem, updateItem, type ItemDraft } from '../../db/items';
import { DEFAULT_FILTERS, useItems, type ItemFilters, type SortKey } from '../../hooks/useItems';
import { useToast } from '../../components/ToastProvider';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ItemCard } from './ItemCard';
import { ItemFormDialog } from './ItemFormDialog';
import { ScanDialog } from './ScanDialog';
import { ExpiringSoon } from './ExpiringSoon';

const PAGE_SIZE = 20;

const SORT_LABELS: Record<SortKey, string> = {
  expiry: 'За терміном',
  name: 'За назвою',
  added: 'Спочатку нові',
  quantity: 'За кількістю',
};

interface Props {
  settings: Settings;
  onItemsChange?: (items: Item[] | undefined) => void;
}

export function InventoryPage({ settings }: Props) {
  const toast = useToast();
  const [filters, setFilters] = useState<ItemFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const [scanOpen, setScanOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [prefill, setPrefill] = useState<Partial<Item> | undefined>();
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null);

  const { visible, expiring, loading } = useItems(
    filters,
    settings.expiryCriticalDays,
    settings.expiryWarningDays,
  );

  // Пагінація замість жорсткого `.slice(0, 10)` старої версії, яка мовчки ховала
  // все, що не влізло в десятку.
  const page = useMemo(() => visible.slice(0, limit), [visible, limit]);
  const hasMore = visible.length > page.length;

  const patchFilters = useCallback((patch: Partial<ItemFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setLimit(PAGE_SIZE);
  }, []);

  const handleAdjust = useCallback(
    (id: number, delta: number) => {
      void toast.run(() => adjustQuantity(id, delta));
    },
    [toast],
  );

  const handleSubmit = useCallback(
    async (draft: ItemDraft) => {
      if (editing?.id != null) {
        await toast.run(() => updateItem(editing.id!, draft), 'Зміни збережено');
      } else {
        const result = await toast.run(() => addOrIncrement(draft));
        if (result) {
          toast.notify(
            result.merged
              ? `«${draft.name}» уже був у запасах — кількість збільшено`
              : `«${draft.name}» додано`,
            'success',
          );
        }
      }
      closeForm();
    },
    [editing, toast],
  );

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setPrefill(undefined);
  };

  const openCreate = () => {
    setEditing(null);
    setPrefill(undefined);
    setFormOpen(true);
  };

  const handleDetected = (code: string) => {
    setScanOpen(false);
    setEditing(null);
    setPrefill({ upc: code });
    setFormOpen(true);
  };

  const confirmDelete = () => {
    const item = pendingDelete;
    setPendingDelete(null);
    if (item?.id != null) void toast.run(() => deleteItem(item.id!), `«${item.name}» видалено`);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <ExpiringSoon
          items={expiring}
          criticalDays={settings.expiryCriticalDays}
          warningDays={settings.expiryWarningDays}
        />

        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            placeholder="Пошук за назвою, штрихкодом, нотаткою"
            value={filters.search}
            onChange={(e) => patchFilters({ search: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant={filtersOpen ? 'contained' : 'outlined'}
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-label="Фільтри"
            sx={{ minWidth: 44, px: 1.5 }}
          >
            <TuneIcon />
          </Button>
        </Stack>

        <Collapse in={filtersOpen} unmountOnExit>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  fullWidth
                  label="Місце"
                  value={filters.location}
                  onChange={(e) => patchFilters({ location: e.target.value as ItemFilters['location'] })}
                >
                  <MenuItem value="all">Усі місця</MenuItem>
                  {LOCATIONS.map((l) => (
                    <MenuItem key={l} value={l}>
                      {LOCATION_LABELS[l]}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  fullWidth
                  label="Категорія"
                  value={filters.category}
                  onChange={(e) => patchFilters({ category: e.target.value as ItemFilters['category'] })}
                >
                  <MenuItem value="all">Усі категорії</MenuItem>
                  {CATEGORIES.map((c) => (
                    <MenuItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  fullWidth
                  label="Сортування"
                  value={filters.sort}
                  onChange={(e) => patchFilters({ sort: e.target.value as SortKey })}
                >
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                    <MenuItem key={key} value={key}>
                      {SORT_LABELS[key]}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.showOutOfStock}
                    onChange={(e) => patchFilters({ showOutOfStock: e.target.checked })}
                  />
                }
                label="Показувати те, що закінчилося"
              />
            </Stack>
          </Paper>
        </Collapse>

        {!loading && visible.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            Показано {page.length} із {visible.length}
          </Typography>
        )}

        {loading ? (
          <Typography color="text.secondary">Завантаження…</Typography>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={filters.search || filtersOpen ? <SearchOffIcon /> : <Inventory2OutlinedIcon />}
            title={filters.search ? 'Нічого не знайдено' : 'Запасів поки немає'}
            hint={
              filters.search
                ? 'Спробуйте інший запит або скиньте фільтри.'
                : 'Проскануйте штрихкод продукту або додайте товар вручну.'
            }
            action={
              filters.search ? (
                <Button onClick={() => setFilters(DEFAULT_FILTERS)}>Скинути фільтри</Button>
              ) : (
                <Button variant="contained" startIcon={<QrCodeScannerIcon />} onClick={() => setScanOpen(true)}>
                  Сканувати
                </Button>
              )
            }
          />
        ) : (
          <>
            <Box
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              {page.map((item) => (
                // Ключ — id, а не назва: два товари з однаковою назвою у старій версії
                // ламали відповідність рядків і React плутав, який з них редагувати.
                <ItemCard
                  key={item.id}
                  item={item}
                  criticalDays={settings.expiryCriticalDays}
                  warningDays={settings.expiryWarningDays}
                  onAdjust={handleAdjust}
                  onEdit={(it) => {
                    setEditing(it);
                    setPrefill(it);
                    setFormOpen(true);
                  }}
                  onDelete={setPendingDelete}
                />
              ))}
            </Box>
            {hasMore && (
              <Button onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                Показати ще ({visible.length - page.length})
              </Button>
            )}
          </>
        )}
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: 'fixed',
          right: 16,
          bottom: 'calc(56px + env(safe-area-inset-bottom) + 16px)',
          zIndex: (t) => t.zIndex.appBar,
        }}
      >
        <Fab size="medium" color="default" onClick={openCreate} aria-label="Додати вручну">
          <AddIcon />
        </Fab>
        <Fab color="primary" variant="extended" onClick={() => setScanOpen(true)}>
          <QrCodeScannerIcon sx={{ mr: 1 }} />
          Сканувати
        </Fab>
      </Stack>

      <ScanDialog open={scanOpen} onDetected={handleDetected} onClose={() => setScanOpen(false)} />

      <ItemFormDialog
        open={formOpen}
        mode={editing ? 'edit' : 'create'}
        initial={prefill}
        onSubmit={handleSubmit}
        onClose={closeForm}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Видалити товар?"
        message={`«${pendingDelete?.name ?? ''}» буде видалено без можливості відновлення. Якщо товар просто закінчився — краще поставити кількість 0.`}
        confirmLabel="Видалити"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Box>
  );
}
