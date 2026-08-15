import { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';

interface Props {
  open: boolean;
  onDetected: (code: string) => void;
  onClose: () => void;
}

/**
 * Діалог сканування. Знайшовши код, одразу віддає його назовні й закривається —
 * форма товару відкривається наступним кроком уже з підставленим штрихкодом.
 */
export function ScanDialog({ open, onDetected, onClose }: Props) {
  const [manual, setManual] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { videoRef, status, error, scanFile } = useBarcodeScanner(open, onDetected);

  const cameraUnavailable = status === 'denied' || status === 'unsupported' || status === 'error';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Сканувати штрихкод</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {!cameraUnavailable && (
            <Box
              sx={{
                position: 'relative',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'common.black',
                aspectRatio: '4 / 3',
              }}
            >
              <Box
                component="video"
                ref={videoRef}
                muted
                playsInline
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Рамка-візир: показує, куди наводити штрихкод. */}
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  inset: '30% 10%',
                  border: '2px solid rgba(255,255,255,0.85)',
                  borderRadius: 1,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
                }}
              />
              {status === 'starting' && (
                <Typography
                  variant="body2"
                  sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'common.white' }}
                >
                  Вмикаємо камеру…
                </Typography>
              )}
            </Box>
          )}

          {error && <Alert severity="warning">{error}</Alert>}

          <Button
            startIcon={<PhotoLibraryOutlinedIcon />}
            onClick={() => fileRef.current?.click()}
            variant={cameraUnavailable ? 'contained' : 'outlined'}
          >
            Розпізнати з фото
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void scanFile(file);
              e.target.value = ''; // щоб те саме фото можна було вибрати вдруге
            }}
          />

          {/* Ручний ввід — обов'язковий запасний шлях: штрихкод буває затертий,
              а камери на десктопі може не бути взагалі. */}
          <TextField
            label="Або введіть штрихкод вручну"
            value={manual}
            onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manual.length >= 8) onDetected(manual);
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Скасувати</Button>
        <Button variant="contained" disabled={manual.length < 8} onClick={() => onDetected(manual)}>
          Далі
        </Button>
      </DialogActions>
    </Dialog>
  );
}
