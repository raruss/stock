import { AppBar, Badge, Box, BottomNavigation, BottomNavigationAction, Toolbar, Typography } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

const NAV_HEIGHT = 56;

interface Props {
  children: ReactNode;
  title: string;
  /** Кількість позицій, що потребують уваги — показується на вкладці «Покупки». */
  shoppingBadge?: number;
  action?: ReactNode;
}

export function AppShell({ children, title, shoppingBadge = 0, action }: Props) {
  const { pathname } = useLocation();
  const current = pathname.startsWith('/shopping')
    ? '/shopping'
    : pathname.startsWith('/settings')
      ? '/settings'
      : '/';

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          {action}
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          // Місце під нижню навігацію + безпечна зона на айфонах із «чубчиком».
          pb: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom) + 16px)`,
          maxWidth: 900,
          mx: 'auto',
        }}
      >
        {children}
      </Box>

      <BottomNavigation
        value={current}
        showLabels
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: (t) => t.zIndex.appBar,
          borderTop: 1,
          borderColor: 'divider',
          height: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
          pb: 'env(safe-area-inset-bottom)',
        }}
      >
        <BottomNavigationAction
          label="Запаси"
          value="/"
          icon={<Inventory2OutlinedIcon />}
          component={Link}
          to="/"
        />
        <BottomNavigationAction
          label="Покупки"
          value="/shopping"
          icon={
            <Badge badgeContent={shoppingBadge} color="primary" max={99}>
              <ShoppingCartOutlinedIcon />
            </Badge>
          }
          component={Link}
          to="/shopping"
        />
        <BottomNavigationAction
          label="Налаштування"
          value="/settings"
          icon={<SettingsOutlinedIcon />}
          component={Link}
          to="/settings"
        />
      </BottomNavigation>
    </Box>
  );
}
