import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Alert, Snackbar, type AlertColor } from '@mui/material';

interface Toast {
  message: string;
  severity: AlertColor;
}

interface ToastApi {
  notify: (message: string, severity?: AlertColor) => void;
  /**
   * Виконує асинхронну дію й показує помилку, якщо вона впала.
   * Замінює `alert()` зі старої `src/db.js`, який блокував інтерфейс.
   */
  run: <T>(action: () => Promise<T>, success?: string) => Promise<T | undefined>;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const notify = useCallback((message: string, severity: AlertColor = 'info') => {
    setToast({ message, severity });
  }, []);

  const run = useCallback(
    async <T,>(action: () => Promise<T>, success?: string): Promise<T | undefined> => {
      try {
        const result = await action();
        if (success) setToast({ message: success, severity: 'success' });
        return result;
      } catch (error) {
        console.error(error);
        setToast({
          message: error instanceof Error ? error.message : 'Сталася невідома помилка',
          severity: 'error',
        });
        return undefined;
      }
    },
    [],
  );

  const api = useMemo<ToastApi>(() => ({ notify, run }), [notify, run]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Snackbar
        open={toast !== null}
        autoHideDuration={toast?.severity === 'error' ? 8000 : 3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        // Піднімаємо над нижньою навігацією, щоб тост її не перекривав.
        sx={{ bottom: { xs: 'calc(56px + env(safe-area-inset-bottom) + 8px)', sm: 24 } }}
      >
        <Alert
          severity={toast?.severity ?? 'info'}
          variant="filled"
          onClose={() => setToast(null)}
          sx={{ width: '100%' }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast треба викликати всередині <ToastProvider>');
  return api;
}
