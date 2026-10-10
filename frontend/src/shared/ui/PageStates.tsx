import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';

interface MessageProps {
  message: string;
}

interface ErrorStateProps extends MessageProps {
  onRetry?: () => void;
  retryLabel?: string;
}

interface PageSkeletonProps {
  label: string;
  heights?: readonly number[];
}

export function LoadingState({ message }: MessageProps) {
  return (
    <Stack
      role="status"
      aria-label={message}
      direction="row"
      spacing={2}
      sx={{ alignItems: 'center' }}
    >
      <CircularProgress size={24} aria-hidden="true" />
      <Typography>{message}</Typography>
    </Stack>
  );
}

export function ErrorState({
  message,
  onRetry,
  retryLabel = 'Повторить',
}: ErrorStateProps) {
  return (
    <Alert
      severity="error"
      action={
        onRetry ? <Button onClick={onRetry}>{retryLabel}</Button> : undefined
      }
    >
      {message}
    </Alert>
  );
}

export function EmptyState({ message }: MessageProps) {
  return (
    <Alert severity="info" role="status">
      {message}
    </Alert>
  );
}

export function PageSkeleton({ label, heights = [96, 96] }: PageSkeletonProps) {
  return (
    <Stack role="status" aria-label={label} spacing={2}>
      <Box
        component="span"
        sx={{ typography: 'body2', color: 'text.secondary' }}
      >
        {label}
      </Box>
      {heights.map((height, index) => (
        <Skeleton
          key={`${index}-${height}`}
          variant="rounded"
          height={height}
          aria-hidden="true"
        />
      ))}
    </Stack>
  );
}
