import { Chip, Tooltip } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { expiryLabel, expiryStatus, formatDate, type ExpiryStatus } from '../utils/dates';

const STYLE: Record<ExpiryStatus, { color: 'default' | 'error' | 'warning' | 'success'; Icon: typeof ScheduleIcon | null }> = {
  expired: { color: 'error', Icon: EventBusyIcon },
  critical: { color: 'error', Icon: ScheduleIcon },
  soon: { color: 'warning', Icon: ScheduleIcon },
  ok: { color: 'success', Icon: EventAvailableIcon },
  none: { color: 'default', Icon: null },
};

interface Props {
  bestBefore: string | null;
  criticalDays: number;
  warningDays: number;
  size?: 'small' | 'medium';
}

export function ExpiryChip({ bestBefore, criticalDays, warningDays, size = 'small' }: Props) {
  const status = expiryStatus(bestBefore, criticalDays, warningDays);
  const { color, Icon } = STYLE[status];

  return (
    <Tooltip title={expiryLabel(bestBefore)}>
      <Chip
        size={size}
        color={color}
        variant={status === 'ok' || status === 'none' ? 'outlined' : 'filled'}
        icon={Icon ? <Icon /> : undefined}
        label={formatDate(bestBefore, 'без терміну')}
        // Колір — не єдиний носій інформації: точна дата в підписі й пояснення
        // в підказці лишаються доступними при дальтонізмі.
        aria-label={`Термін придатності: ${formatDate(bestBefore, 'не вказано')}, ${expiryLabel(bestBefore)}`}
      />
    </Tooltip>
  );
}
