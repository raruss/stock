import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, hint, action }: Props) {
  return (
    <Box sx={{ py: 8, px: 3, display: 'grid', placeItems: 'center' }}>
      <Stack spacing={1.5} alignItems="center" textAlign="center" maxWidth={340}>
        <Box sx={{ color: 'text.disabled', display: 'flex', '& svg': { fontSize: 56 } }}>{icon}</Box>
        <Typography variant="subtitle1">{title}</Typography>
        {hint && (
          <Typography variant="body2" color="text.secondary">
            {hint}
          </Typography>
        )}
        {action}
      </Stack>
    </Box>
  );
}
