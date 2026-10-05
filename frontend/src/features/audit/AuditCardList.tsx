import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import type { AuditEntry } from '../../shared/api/audit';
import {
  actionLabels,
  auditSummary,
  entityLabels,
  formatAuditTimestamp,
} from './audit-display';

interface AuditCardListProps {
  entries: AuditEntry[];
  timeZone: string;
  onDetails(entry: AuditEntry): void;
}

const actionColors = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
} as const;

export function AuditCardList({
  entries,
  timeZone,
  onDetails,
}: AuditCardListProps) {
  return (
    <Box
      component="ol"
      aria-label="Карточки изменений"
      sx={{
        py: 0,
        pr: 0,
        pl: 3,
        ml: 1,
        listStyle: 'none',
        display: 'grid',
        gap: 2,
        borderLeft: '2px solid',
        borderColor: 'divider',
      }}
    >
      {entries.map((entry) => (
        <Box
          component="li"
          key={entry.id}
          sx={{
            position: 'relative',
            minWidth: 0,
            '&::before': {
              content: '""',
              position: 'absolute',
              left: (theme) => theme.spacing(-4),
              top: 24,
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              outline: '3px solid',
              outlineColor: 'background.default',
            },
          }}
        >
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1}>
                <Typography component="h2" variant="h6">
                  {auditSummary(entry)}
                </Typography>
                <Chip
                  size="small"
                  label={actionLabels[entry.action]}
                  color={actionColors[entry.action]}
                  sx={{ alignSelf: 'flex-start' }}
                />
                <Typography color="text.secondary">
                  {entityLabels[entry.entityType]}
                </Typography>
                <Typography
                  component="time"
                  dateTime={entry.createdAt}
                  color="text.secondary"
                >
                  {formatAuditTimestamp(entry.createdAt, timeZone)}
                </Typography>
              </Stack>
            </CardContent>
            <CardActions>
              <Button
                onClick={() => onDetails(entry)}
                aria-label="Подробнее об изменении"
              >
                Подробнее
              </Button>
            </CardActions>
          </Card>
        </Box>
      ))}
    </Box>
  );
}
