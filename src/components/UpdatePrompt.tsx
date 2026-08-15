import { Alert, Button, Snackbar } from '@mui/material';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Пропозиція оновитись, коли service worker підтягнув нову версію.
 *
 * `registerType: 'prompt'` замість автоматичного перезавантаження — щоб застосунок
 * не перезавантажився сам посеред заповнення форми товару.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <Snackbar open={needRefresh} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
      <Alert
        severity="info"
        variant="filled"
        action={
          <>
            <Button color="inherit" size="small" onClick={() => void updateServiceWorker(true)}>
              Оновити
            </Button>
            <Button color="inherit" size="small" onClick={() => setNeedRefresh(false)}>
              Пізніше
            </Button>
          </>
        }
      >
        Доступна нова версія
      </Alert>
    </Snackbar>
  );
}
