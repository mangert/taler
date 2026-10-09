import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import { Chip, Stack, Typography } from '@mui/material';

interface RecurringRuleStatusProps {
  isActive: boolean;
  compact?: boolean;
}

export function RecurringRuleStatus({
  isActive,
  compact = false,
}: RecurringRuleStatusProps) {
  const icon = isActive ? (
    <CheckCircleOutlinedIcon titleAccess="Активное правило" fontSize="small" />
  ) : (
    <PauseCircleOutlinedIcon
      titleAccess="Приостановленное правило"
      fontSize="small"
    />
  );
  const label = isActive ? 'Активно' : 'Приостановлено';

  if (compact)
    return (
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: 'center',
          color: isActive ? 'success.dark' : 'text.secondary',
          minWidth: 0,
        }}
      >
        {icon}
        <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
          {label}
        </Typography>
      </Stack>
    );

  return (
    <Chip
      icon={icon}
      label={label}
      color={isActive ? 'success' : 'default'}
      size="small"
    />
  );
}
