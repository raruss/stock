import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Ловить помилки рендеру, щоб один зіпсований запис не давав білий екран на весь
 * застосунок — саме так поводилася стара версія при порожньому терміні придатності.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Помилка рендеру:', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Box sx={{ p: 4, display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
        <Stack spacing={2} alignItems="center" textAlign="center" maxWidth={420}>
          <ReportProblemOutlinedIcon color="warning" sx={{ fontSize: 48 }} />
          <Typography variant="h6">Щось пішло не так</Typography>
          <Typography variant="body2" color="text.secondary">
            Дані у сховищі не постраждали. Спробуйте перезавантажити сторінку, а якщо
            помилка повторюється — зробіть експорт у «Налаштуваннях».
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ wordBreak: 'break-word' }}>
            {error.message}
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Перезавантажити
          </Button>
        </Stack>
      </Box>
    );
  }
}
