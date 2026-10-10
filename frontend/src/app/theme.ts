import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      light: '#E6C781',
      main: '#D9AB53',
      dark: '#B78332',
      contrastText: '#211B13',
    },
    secondary: {
      light: '#B7C995',
      main: '#9FB77A',
      dark: '#8FA66E',
      contrastText: '#1F261B',
    },
    success: {
      light: '#C1D19E',
      main: '#AABD82',
      dark: '#8FA66E',
      contrastText: '#1F261B',
    },
    warning: {
      light: '#F0C57E',
      main: '#E0AD61',
      dark: '#C78C49',
      contrastText: '#211B13',
    },
    error: {
      light: '#F2AE98',
      main: '#E8947D',
      dark: '#C57563',
      contrastText: '#2A1712',
    },
    info: {
      light: '#D2BEA0',
      main: '#BFA786',
      dark: '#9E8B70',
      contrastText: '#211B13',
    },
    background: { default: '#191813', paper: '#27251F' },
    text: { primary: '#F5EFE3', secondary: '#C8BDA9' },
    divider: '#514A3D',
  },
  spacing: 8,
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.035em' },
    h2: { fontWeight: 700, letterSpacing: '-0.03em' },
    h3: {
      fontSize: 'clamp(2rem, 3vw, 2.6rem)',
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1.18,
    },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 650 },
    button: { fontWeight: 650, textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        body: { colorScheme: 'dark' },
        '::selection': {
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            scrollBehavior: 'auto !important',
            transitionDuration: '0.01ms !important',
          },
        },
      }),
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          boxShadow: 'none',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }),
        colorDefault: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-focusVisible': {
            outline: `3px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        }),
      },
    },
    MuiButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          minHeight: 42,
          paddingInline: theme.spacing(2),
        }),
        sizeSmall: { minHeight: 36 },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.borderRadius,
          backgroundImage: 'none',
        }),
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(3),
          '&:last-child': { paddingBottom: theme.spacing(3) },
        }),
      },
    },
    MuiTextField: { defaultProps: { size: 'medium', variant: 'outlined' } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          backgroundColor: theme.palette.background.paper,
        }),
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: ({ theme }) => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.borderRadius,
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderBottom: `1px solid ${theme.palette.divider}`,
          padding: theme.spacing(1.5, 2),
        }),
        head: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.secondary,
          fontWeight: 700,
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.borderRadius,
          backgroundImage: 'none',
        }),
        paperFullScreen: { borderRadius: 0 },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: ({ theme }) => ({ padding: theme.spacing(3) }) },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: ({ theme }) => ({ paddingInline: theme.spacing(3) }),
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme }) => ({ padding: theme.spacing(2, 3) }),
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: ({ theme }) => ({
          height: 8,
          borderRadius: theme.shape.borderRadius,
          backgroundColor: theme.palette.action.hover,
        }),
        bar: ({ theme }) => ({ borderRadius: theme.shape.borderRadius }),
      },
    },
  },
});
