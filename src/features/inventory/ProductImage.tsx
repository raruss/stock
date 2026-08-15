import { useState } from 'react';
import { Box } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';

interface Props {
  src?: string;
  name: string;
  size?: number;
}

/**
 * Фото товару з плейсхолдером.
 *
 * Стара версія рендерила `<img src={row.image}>` без `alt` і без запасного варіанта:
 * товар без фото давав «битий» значок, а читач екрана — порожній рядок.
 */
export function ProductImage({ src, name, size = 56 }: Props) {
  const [failed, setFailed] = useState(false);
  const box = {
    width: size,
    height: size,
    borderRadius: 1.5,
    flexShrink: 0,
    overflow: 'hidden',
  } as const;

  if (!src || failed) {
    return (
      <Box
        sx={{
          ...box,
          bgcolor: 'action.hover',
          display: 'grid',
          placeItems: 'center',
          color: 'text.disabled',
        }}
        role="img"
        aria-label={`Фото відсутнє: ${name}`}
      >
        <Inventory2OutlinedIcon fontSize="small" />
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      sx={{ ...box, objectFit: 'cover', bgcolor: 'action.hover' }}
    />
  );
}
