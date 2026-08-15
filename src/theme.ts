import { createTheme, type Theme } from '@mui/material/styles';
import { ukUA } from '@mui/material/locale';

/** Зелений — «свіже», під суть застосунку; попередження й прострочення лишаються за
 *  жовтим і червоним, тож три стани терміну не зливаються між собою. */
export function buildTheme(mode: 'light' | 'dark'): Theme {
  return createTheme(
    {
      palette: {
        mode,
        primary: { main: mode === 'light' ? '#2e7d32' : '#7cc47f' },
        secondary: { main: mode === 'light' ? '#00695c' : '#4db6ac' },
        warning: { main: mode === 'light' ? '#ed6c02' : '#ffb74d' },
        error: { main: mode === 'light' ? '#d32f2f' : '#ef5350' },
        background: {
          default: mode === 'light' ? '#f6f7f4' : '#12140f',
          paper: mode === 'light' ? '#ffffff' : '#1c1f19',
        },
      },
      shape: { borderRadius: 12 },
      typography: {
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        h6: { fontWeight: 600 },
        subtitle1: { fontWeight: 600 },
      },
      components: {
        MuiButton: { defaultProps: { disableElevation: true } },
        MuiTextField: { defaultProps: { size: 'small' } },
        MuiIconButton: {
          styleOverrides: {
            // Мінімальна зона дотику 44×44 — застосунком користуються з телефона однією рукою.
            root: { minWidth: 44, minHeight: 44 },
          },
        },
      },
    },
    ukUA,
  );
}
