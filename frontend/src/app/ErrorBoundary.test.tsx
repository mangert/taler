import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/render-with-providers';
import { ErrorBoundary } from './ErrorBoundary';

it('contains a page error and retries rendering when requested', async () => {
  const user = userEvent.setup();
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  let shouldThrow = true;

  function RecoverablePage() {
    if (shouldThrow) throw new Error('Temporary render error');
    return <h1>Страница восстановлена</h1>;
  }

  renderWithProviders(
    <ErrorBoundary>
      <RecoverablePage />
    </ErrorBoundary>,
  );

  expect(screen.getByText('Не удалось показать страницу.')).toBeInTheDocument();
  shouldThrow = false;
  await user.click(screen.getByRole('button', { name: 'Повторить' }));
  expect(
    screen.getByRole('heading', { name: 'Страница восстановлена' }),
  ).toBeInTheDocument();
  consoleError.mockRestore();
});
