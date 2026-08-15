import { Box, Chip, IconButton, Paper, Stack, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Item } from '../../db/types';
import { CATEGORY_LABELS, LOCATION_LABELS } from '../../i18n';
import { ExpiryChip } from '../../components/ExpiryChip';
import { QuantityStepper } from '../../components/QuantityStepper';
import { ProductImage } from './ProductImage';

interface Props {
  item: Item;
  criticalDays: number;
  warningDays: number;
  onAdjust: (id: number, delta: number) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
}

export function ItemCard({ item, criticalDays, warningDays, onAdjust, onEdit, onDelete }: Props) {
  const id = item.id!;
  const outOfStock = item.quantity <= 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        display: 'flex',
        gap: 1.5,
        alignItems: 'flex-start',
        opacity: outOfStock ? 0.6 : 1,
      }}
    >
      <ProductImage src={item.image} name={item.name} />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>
          {item.name}
        </Typography>

        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
          <ExpiryChip
            bestBefore={item.bestBefore}
            criticalDays={criticalDays}
            warningDays={warningDays}
          />
          <Chip size="small" variant="outlined" label={LOCATION_LABELS[item.location]} />
          {item.category !== 'other' && (
            <Chip size="small" variant="outlined" label={CATEGORY_LABELS[item.category]} />
          )}
          {outOfStock && <Chip size="small" color="default" label="закінчився" />}
        </Stack>

        {item.note && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {item.note}
          </Typography>
        )}

        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <QuantityStepper
            quantity={item.quantity}
            unit={item.unit}
            name={item.name}
            onChange={(delta) => onAdjust(id, delta)}
          />
          <Box>
            <IconButton size="small" onClick={() => onEdit(item)} aria-label={`Редагувати: ${item.name}`}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onDelete(item)} aria-label={`Видалити: ${item.name}`}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
