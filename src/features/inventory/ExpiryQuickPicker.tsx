import { Box, Chip, Tooltip, Typography } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import ClearIcon from '@mui/icons-material/Clear';
import type { Category } from '../../db/types';
import { useShelfLifeSuggestion } from '../../hooks/useShelfLifeSuggestion';
import { describeDays, shiftFromToday, type ShiftUnit } from '../../utils/shelfLife';
import { formatDate } from '../../utils/dates';

const PRESETS: Array<{ label: string; amount: number; unit: ShiftUnit }> = [
  { label: '+3 дні', amount: 3, unit: 'day' },
  { label: '+тиждень', amount: 1, unit: 'week' },
  { label: '+місяць', amount: 1, unit: 'month' },
  { label: '+рік', amount: 1, unit: 'year' },
];

interface Props {
  value: string | null;
  upc: string;
  category: Category;
  onChange: (bestBefore: string | null) => void;
}

/**
 * Швидкий ввід терміну придатності в один дотик.
 *
 * Дата — найнудніше поле форми: вибирати її в календарі, стоячи біля холодильника
 * з телефоном в одній руці, незручно. Пресети покривають більшість реальних випадків.
 *
 * Підказка нічого не заповнює сама: дата придатності — питання харчової безпеки,
 * і мовчки підставлена неправильна дата гірша за порожнє поле. Тому один дотик,
 * а не автозаповнення.
 */
export function ExpiryQuickPicker({ value, upc, category, onChange }: Props) {
  const suggestion = useShelfLifeSuggestion(upc, category);

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
      {suggestion && (
        <Tooltip
          title={
            suggestion.source === 'history'
              ? 'Порахували з ваших попередніх покупок цього товару'
              : 'Типовий термін для цієї категорії — перевірте напис на упаковці'
          }
        >
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            icon={suggestion.source === 'history' ? <HistoryIcon /> : undefined}
            label={`Зазвичай ${describeDays(suggestion.days)}`}
            onClick={() => onChange(shiftFromToday(suggestion.days, 'day'))}
          />
        </Tooltip>
      )}

      {PRESETS.map((preset) => (
        <Chip
          key={preset.label}
          size="small"
          variant="outlined"
          label={preset.label}
          onClick={() => onChange(shiftFromToday(preset.amount, preset.unit))}
        />
      ))}

      {value && (
        <Chip
          size="small"
          variant="outlined"
          icon={<ClearIcon />}
          label="без терміну"
          onClick={() => onChange(null)}
        />
      )}

      {value && (
        <Typography variant="caption" color="text.secondary" sx={{ width: '100%' }}>
          {formatDate(value)}
        </Typography>
      )}
    </Box>
  );
}
