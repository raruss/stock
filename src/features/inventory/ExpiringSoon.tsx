import { Alert, AlertTitle, Box, Chip, Collapse, Stack } from '@mui/material';
import { useState } from 'react';
import type { Item } from '../../db/types';
import { daysLeft, expiryLabel, plural } from '../../utils/dates';

interface Props {
  items: Item[];
  criticalDays: number;
  warningDays: number;
}

/**
 * Блок «спливає термін» угорі списку — головна причина, заради якої такий застосунок
 * узагалі відкривають. Прострочене й критичне рознесено, щоб «уже зіпсувалося»
 * не губилось серед «треба з'їсти цього тижня».
 */
export function ExpiringSoon({ items, criticalDays }: Props) {
  const [open, setOpen] = useState(true);
  if (items.length === 0) return null;

  const expired = items.filter((i) => (daysLeft(i.bestBefore) ?? 0) < 0);
  const urgent = items.filter((i) => {
    const left = daysLeft(i.bestBefore);
    return left !== null && left >= 0 && left <= criticalDays;
  });
  const soon = items.filter((i) => (daysLeft(i.bestBefore) ?? 0) > criticalDays);

  return (
    <Stack spacing={1}>
      {expired.length > 0 && (
        <Alert severity="error" onClick={() => setOpen((v) => !v)} sx={{ cursor: 'pointer' }}>
          <AlertTitle sx={{ mb: 0 }}>
            Прострочено: {plural(expired.length, 'товар', 'товари', 'товарів')}
          </AlertTitle>
          <Collapse in={open}>
            <ItemChips items={expired} />
          </Collapse>
        </Alert>
      )}

      {urgent.length > 0 && (
        <Alert severity="warning" onClick={() => setOpen((v) => !v)} sx={{ cursor: 'pointer' }}>
          <AlertTitle sx={{ mb: 0 }}>Треба з’їсти найближчим часом</AlertTitle>
          <Collapse in={open}>
            <ItemChips items={urgent} />
          </Collapse>
        </Alert>
      )}

      {soon.length > 0 && expired.length === 0 && urgent.length === 0 && (
        <Alert severity="info" onClick={() => setOpen((v) => !v)} sx={{ cursor: 'pointer' }}>
          <AlertTitle sx={{ mb: 0 }}>Термін спливає цього тижня</AlertTitle>
          <Collapse in={open}>
            <ItemChips items={soon} />
          </Collapse>
        </Alert>
      )}
    </Stack>
  );
}

function ItemChips({ items }: { items: Item[] }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
      {items.map((item) => (
        <Chip
          key={item.id}
          size="small"
          variant="outlined"
          label={`${item.name} — ${expiryLabel(item.bestBefore)}`}
        />
      ))}
    </Box>
  );
}
