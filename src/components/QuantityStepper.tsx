import { Box, IconButton, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { UNIT_LABELS } from '../i18n';
import type { Unit } from '../db/types';

interface Props {
  quantity: number;
  unit: Unit;
  name: string;
  onChange: (delta: number) => void;
  disabled?: boolean;
}

/** Кнопки −/+ прямо в списку: списати спожите має бути справою одного дотику. */
export function QuantityStepper({ quantity, unit, name, onChange, disabled }: Props) {
  const step = unit === 'kg' || unit === 'l' ? 0.1 : 1;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <IconButton
        size="small"
        disabled={disabled || quantity <= 0}
        onClick={() => onChange(-step)}
        aria-label={`Зменшити кількість: ${name}`}
      >
        <RemoveIcon fontSize="small" />
      </IconButton>

      <Typography
        variant="body2"
        sx={{ minWidth: 56, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
        // Озвучуємо зміну кількості для читачів екрана.
        aria-live="polite"
      >
        {formatQuantity(quantity)} {UNIT_LABELS[unit]}
      </Typography>

      <IconButton
        size="small"
        disabled={disabled}
        onClick={() => onChange(step)}
        aria-label={`Збільшити кількість: ${name}`}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

export function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
