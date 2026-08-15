import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { CATEGORIES, LOCATIONS, UNITS, EMPTY_ITEM, type Item } from '../../db/types';
import type { ItemDraft } from '../../db/items';
import { CATEGORY_LABELS, LOCATION_LABELS, UNIT_LABELS } from '../../i18n';
import { useProductLookup } from '../../hooks/useProductLookup';
import { ProductImage } from './ProductImage';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Partial<Item>;
  onSubmit: (draft: ItemDraft) => Promise<void> | void;
  onClose: () => void;
}

type FormState = ItemDraft & { image?: string; note?: string };

/**
 * Єдина форма товару — для додавання вручну, для сканування і для редагування.
 *
 * У старій версії ця форма існувала в трьох копіях (`Add.js`, `Scan.js`, `Edit.js`),
 * і вони встигли розійтися: в `Add.js` контрольованим було лише поле «назва», тож
 * решта полів зберігала значення від попереднього відкриття діалогу.
 */
export function ItemFormDialog({ open, mode, initial, onSubmit, onClose }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [form, setForm] = useState<FormState>(() => ({ ...EMPTY_ITEM, ...initial }));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  // Пошук в OpenFoodFacts запускається лише на явне «Знайти» або після сканування,
  // а не на кожен символ у полі штрихкоду.
  const [lookupCode, setLookupCode] = useState('');

  const lookup = useProductLookup(lookupCode);

  // Скидаємо стан щоразу при відкритті — інакше діалог показував би попередній товар.
  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY_ITEM, ...initial });
    setTouched(false);
    setSaving(false);
    setLookupCode(initial?.upc && mode === 'create' ? initial.upc : '');
  }, [open, initial, mode]);

  // Знайдені назву й фото підставляємо лише в порожні поля, щоб не затерти ручний ввід.
  useEffect(() => {
    if (lookup.status !== 'found') return;
    setForm((prev) => ({
      ...prev,
      name: prev.name.trim() ? prev.name : lookup.product.name,
      image: prev.image ?? lookup.product.image,
    }));
  }, [lookup]);

  const nameError = touched && !form.name.trim() ? 'Вкажіть назву товару' : '';
  const quantityError =
    touched && (!Number.isFinite(form.quantity) || form.quantity < 0)
      ? 'Кількість не може бути від’ємною'
      : '';
  const valid = !!form.name.trim() && Number.isFinite(form.quantity) && form.quantity >= 0;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /**
   * Сабміт іде через `<form onSubmit>`, а кнопка в `DialogActions` прив'язана до форми
   * через `form="item-form"`. У старій версії кнопка лежала поза `<form>`, тому
   * `type="submit"` не спрацьовував, а `onClick` обходив валідацію повністю.
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        upc: form.upc.trim(),
        note: form.note?.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const lookupHint = useMemo(() => {
    switch (lookup.status) {
      case 'loading':
        return { severity: 'info' as const, text: 'Шукаємо товар у базі…' };
      case 'notFound':
        return {
          severity: 'warning' as const,
          text: 'Товару немає у базі OpenFoodFacts — заповніть назву вручну.',
        };
      case 'error':
        return { severity: 'warning' as const, text: lookup.message };
      default:
        return null;
    }
  }, [lookup]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle>{mode === 'create' ? 'Новий товар' : 'Редагувати товар'}</DialogTitle>

      <DialogContent dividers>
        <Box component="form" id="item-form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {form.image && (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <ProductImage src={form.image} name={form.name} size={96} />
              </Box>
            )}

            <TextField
              label="Штрихкод"
              value={form.upc}
              onChange={(e) => set('upc', e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              autoComplete="off"
              helperText="Необов’язково — можна додати товар і без нього"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      startIcon={
                        lookup.status === 'loading' ? (
                          <CircularProgress size={14} />
                        ) : (
                          <SearchIcon fontSize="small" />
                        )
                      }
                      disabled={form.upc.length < 8 || lookup.status === 'loading'}
                      onClick={() => setLookupCode(form.upc)}
                    >
                      Знайти
                    </Button>
                  </InputAdornment>
                ),
              }}
            />

            {lookupHint && (
              <Alert severity={lookupHint.severity} variant="outlined">
                {lookupHint.text}
              </Alert>
            )}

            <TextField
              label="Назва"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              onBlur={() => setTouched(true)}
              error={!!nameError}
              helperText={nameError}
              required
              autoFocus={!fullScreen}
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Кількість"
                type="number"
                value={form.quantity}
                // Значення з <input> завжди рядок — перетворюємо одразу тут, щоб у базу
                // ніколи не потрапило "2" замість 2. Саме через це старий фільтр за
                // кількістю працював неправильно.
                onChange={(e) => set('quantity', e.target.value === '' ? 0 : Number(e.target.value))}
                onBlur={() => setTouched(true)}
                error={!!quantityError}
                helperText={quantityError}
                inputProps={{ min: 0, step: 'any', inputMode: 'decimal' }}
                sx={{ flex: 1 }}
                required
              />
              <TextField
                select
                label="Одиниця"
                value={form.unit}
                onChange={(e) => set('unit', e.target.value as FormState['unit'])}
                sx={{ width: 120 }}
              >
                {UNITS.map((unit) => (
                  <MenuItem key={unit} value={unit}>
                    {UNIT_LABELS[unit]}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              label="Термін придатності"
              type="date"
              value={form.bestBefore ?? ''}
              // Порожня дата зберігається як null, а не як '' — саме порожній рядок
              // валив старий застосунок на `format(new Date(''))`.
              onChange={(e) => set('bestBefore', e.target.value || null)}
              InputLabelProps={{ shrink: true }}
              helperText="Можна не вказувати"
            />

            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Місце"
                value={form.location}
                onChange={(e) => set('location', e.target.value as FormState['location'])}
                sx={{ flex: 1 }}
              >
                {LOCATIONS.map((location) => (
                  <MenuItem key={location} value={location}>
                    {LOCATION_LABELS[location]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Категорія"
                value={form.category}
                onChange={(e) => set('category', e.target.value as FormState['category'])}
                sx={{ flex: 1 }}
              >
                {CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              label="Мінімальний запас"
              type="number"
              value={form.minQuantity}
              onChange={(e) => set('minQuantity', e.target.value === '' ? 0 : Number(e.target.value))}
              inputProps={{ min: 0, step: 'any', inputMode: 'decimal' }}
              helperText="Коли залишок впаде нижче — товар з’явиться у списку покупок. 0 — не стежити"
            />

            <TextField
              label="Нотатка"
              value={form.note ?? ''}
              onChange={(e) => set('note', e.target.value)}
              multiline
              minRows={2}
            />

            {mode === 'create' && (
              <Typography variant="caption" color="text.secondary">
                Якщо товар із таким штрихкодом і терміном уже є, кількість додасться до наявного.
              </Typography>
            )}
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Скасувати
        </Button>
        <Button type="submit" form="item-form" variant="contained" disabled={saving}>
          {mode === 'create' ? 'Додати' : 'Зберегти'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
