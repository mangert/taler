import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/render-with-providers';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageSkeleton,
} from './PageStates';

it('announces loading with a visible description', () => {
  renderWithProviders(<LoadingState message="Проверяем сессию…" />);

  expect(
    screen.getByRole('status', { name: 'Проверяем сессию…' }),
  ).toBeVisible();
  expect(screen.getByText('Проверяем сессию…')).toBeVisible();
});

it('announces a page skeleton without exposing placeholder shapes', () => {
  renderWithProviders(
    <PageSkeleton label="Загрузка категорий" heights={[80, 120]} />,
  );

  expect(
    screen.getByRole('status', { name: 'Загрузка категорий' }),
  ).toBeVisible();
  expect(screen.getByText('Загрузка категорий')).toBeInTheDocument();
  expect(
    screen.getByRole('status').querySelectorAll('[aria-hidden="true"]'),
  ).toHaveLength(2);
});

it('offers a keyboard-operable retry for an error', async () => {
  const user = userEvent.setup();
  const onRetry = vi.fn();
  renderWithProviders(
    <ErrorState message="Не удалось загрузить категории." onRetry={onRetry} />,
  );

  expect(screen.getByRole('alert')).toHaveTextContent(
    'Не удалось загрузить категории.',
  );
  await user.tab();
  expect(screen.getByRole('button', { name: 'Повторить' })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(onRetry).toHaveBeenCalledTimes(1);
});

it('presents an empty result as a non-error status', () => {
  renderWithProviders(<EmptyState message="У вас пока нет категорий." />);

  expect(screen.getByRole('status')).toHaveTextContent(
    'У вас пока нет категорий.',
  );
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
