import { useTheme } from '@mui/material/styles';
import { useQueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { appTheme } from '../app/theme';
import { renderWithProviders } from './render-with-providers';

function ContextProbe() {
  const location = useLocation();
  const theme = useTheme();
  const queryClient = useQueryClient();

  return (
    <div>
      {location.pathname} · {theme.palette.primary.main} ·{' '}
      {queryClient.getQueryData(['probe']) ?? 'пусто'}
    </div>
  );
}

it('provides a router and theme with an isolated QueryClient for each render', () => {
  const first = renderWithProviders(<ContextProbe />, { route: '/first' });
  expect(
    screen.getByText(`/first · ${appTheme.palette.primary.main} · пусто`),
  ).toBeInTheDocument();
  first.queryClient.setQueryData(['probe'], 'данные первого теста');
  first.unmount();

  const second = renderWithProviders(<ContextProbe />, { route: '/second' });
  expect(second.queryClient).not.toBe(first.queryClient);
  expect(
    screen.getByText(`/second · ${appTheme.palette.primary.main} · пусто`),
  ).toBeInTheDocument();
});
