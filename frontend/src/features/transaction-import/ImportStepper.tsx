import { Box, Typography } from '@mui/material';

const steps = [
  { id: 'file', label: 'Файл' },
  { id: 'mapping', label: 'Сопоставление' },
  { id: 'preview', label: 'Предпросмотр' },
  { id: 'result', label: 'Результат' },
] as const;

export type ImportStep = (typeof steps)[number]['id'];

interface ImportStepperProps {
  currentStep: ImportStep;
}

export function ImportStepper({ currentStep }: ImportStepperProps) {
  return (
    <Box component="nav" aria-label="Этапы импорта">
      <Box
        component="ol"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, minmax(0, 1fr))' },
          gap: 1,
          listStyle: 'none',
          m: 0,
          p: 0,
        }}
      >
        {steps.map(({ id, label }) => {
          const active = id === currentStep;
          return (
            <Box
              component="li"
              key={id}
              aria-current={active ? 'step' : undefined}
              sx={{
                border: 1,
                borderColor: active ? 'primary.main' : 'divider',
                borderRadius: 1,
                bgcolor: active ? 'action.selected' : 'background.paper',
                minWidth: 0,
                px: 2,
                py: 1,
              }}
            >
              <Typography
                component="span"
                variant="body2"
                sx={{ fontWeight: active ? 700 : 400 }}
              >
                {label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
