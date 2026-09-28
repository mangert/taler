import { Pagination, Stack, Typography } from '@mui/material';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  onChange(page: number): void;
}

export function PaginationControls({
  page,
  totalPages,
  total,
  onChange,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;
  return (
    <Stack spacing={1} sx={{ alignItems: 'center' }}>
      <Typography color="text.secondary" variant="body2">
        Всего транзакций: {total}
      </Typography>
      <Pagination
        aria-label="Страницы транзакций"
        count={totalPages}
        page={page}
        onChange={(_event, nextPage) => onChange(nextPage)}
      />
    </Stack>
  );
}
