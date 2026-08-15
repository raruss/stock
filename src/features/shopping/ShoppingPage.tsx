import { useCallback, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';

import { db } from '../../db';
import {
  addShoppingEntry,
  clearDoneShopping,
  deleteShoppingEntry,
  setShoppingDone,
  suggestRestock,
} from '../../db/shopping';
import { addOrIncrement, type ItemDraft } from '../../db/items';
import type { Item, ShoppingEntry } from '../../db/types';
import { EMPTY_ITEM } from '../../db/types';
import { UNIT_LABELS } from '../../i18n';
import { useToast } from '../../components/ToastProvider';
import { EmptyState } from '../../components/EmptyState';
import { ItemFormDialog } from '../inventory/ItemFormDialog';

export function ShoppingPage() {
  const toast = useToast();
  const [draft, setDraft] = useState('');
  const [buying, setBuying] = useState<Partial<Item> | null>(null);

  const entries = useLiveQuery(() => db.shopping.toArray(), []);
  const items = useLiveQuery(() => db.items.toArray(), []);

  const suggestions = useMemo(
    () => suggestRestock(items ?? [], entries ?? []),
    [items, entries],
  );

  const pending = (entries ?? []).filter((e) => !e.done);
  const done = (entries ?? []).filter((e) => e.done);

  const handleAdd = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const name = draft.trim();
      if (!name) return;
      setDraft('');
      void toast.run(() => addShoppingEntry({ name, upc: '', quantity: 1, unit: 'pcs' }));
    },
    [draft, toast],
  );

  const handleAddSuggestion = useCallback(
    (item: Item) => {
      void toast.run(() =>
        addShoppingEntry({
          name: item.name,
          upc: item.upc,
          quantity: Math.max(1, item.minQuantity || 1),
          unit: item.unit,
          sourceItemId: item.id,
        }),
      );
    },
    [toast],
  );

  /** «Куплено» → відкриваємо форму товару з підставленими назвою й штрихкодом. */
  const handleBought = useCallback((entry: ShoppingEntry) => {
    setBuying({
      ...EMPTY_ITEM,
      name: entry.name,
      upc: entry.upc,
      quantity: entry.quantity,
      unit: entry.unit,
    });
  }, []);

  const handleStock = useCallback(
    async (itemDraft: ItemDraft) => {
      await toast.run(() => addOrIncrement(itemDraft), `«${itemDraft.name}» у запасах`);
      // Позицію зі списку прибираємо лише після успішного додавання в запаси.
      const entry = (entries ?? []).find((e) => e.name === itemDraft.name && !e.done);
      if (entry?.id != null) await deleteShoppingEntry(entry.id);
      setBuying(null);
    },
    [entries, toast],
  );

  const empty = pending.length === 0 && done.length === 0 && suggestions.length === 0;

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box component="form" onSubmit={handleAdd}>
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              placeholder="Що купити?"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button type="submit" variant="contained" disabled={!draft.trim()} sx={{ minWidth: 44 }}>
              <AddIcon />
            </Button>
          </Stack>
        </Box>

        {suggestions.length > 0 && (
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" gutterBottom>
              Закінчується — додати до списку?
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {suggestions.map((item) => (
                <Chip
                  key={item.id}
                  label={`${item.name} · ${item.quantity} ${UNIT_LABELS[item.unit]}`}
                  onClick={() => handleAddSuggestion(item)}
                  icon={<AddIcon />}
                  variant="outlined"
                />
              ))}
            </Box>
          </Paper>
        )}

        {empty ? (
          <EmptyState
            icon={<ShoppingCartOutlinedIcon />}
            title="Список порожній"
            hint="Додайте позицію вручну або поставте товарам мінімальний запас — тоді вони потраплятимуть сюди самі, щойно почнуть закінчуватися."
          />
        ) : (
          <Paper variant="outlined">
            <List disablePadding>
              {pending.map((entry) => (
                <ListItem
                  key={entry.id}
                  disablePadding
                  secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" onClick={() => handleBought(entry)}>
                        У запаси
                      </Button>
                      <IconButton
                        edge="end"
                        onClick={() => void toast.run(() => deleteShoppingEntry(entry.id!))}
                        aria-label={`Прибрати зі списку: ${entry.name}`}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                >
                  <ListItemButton onClick={() => void toast.run(() => setShoppingDone(entry.id!, true))}>
                    <Checkbox edge="start" checked={false} tabIndex={-1} disableRipple />
                    <ListItemText
                      primary={entry.name}
                      secondary={`${entry.quantity} ${UNIT_LABELS[entry.unit]}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}

              {done.length > 0 && <Divider />}

              {done.map((entry) => (
                <ListItem key={entry.id} disablePadding>
                  <ListItemButton onClick={() => void toast.run(() => setShoppingDone(entry.id!, false))}>
                    <Checkbox edge="start" checked tabIndex={-1} disableRipple />
                    <ListItemText
                      primary={entry.name}
                      sx={{ textDecoration: 'line-through', opacity: 0.6 }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        {done.length > 0 && (
          <Button
            startIcon={<PlaylistAddCheckIcon />}
            onClick={() => void toast.run(() => clearDoneShopping(), 'Куплене прибрано зі списку')}
          >
            Прибрати куплене ({done.length})
          </Button>
        )}
      </Stack>

      <ItemFormDialog
        open={buying !== null}
        mode="create"
        initial={buying ?? undefined}
        onSubmit={handleStock}
        onClose={() => setBuying(null)}
      />
    </Box>
  );
}
