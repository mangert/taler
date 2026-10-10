import { Box } from '@mui/material';
import { Component, type ReactNode } from 'react';
import { ErrorState } from '../shared/ui/PageStates';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Box component="main" sx={{ mx: 'auto', maxWidth: 560, p: 3 }}>
          <ErrorState
            message="Не удалось показать страницу."
            onRetry={() => this.setState({ hasError: false })}
          />
        </Box>
      );
    }

    return this.props.children;
  }
}
