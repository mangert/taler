import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/render-with-providers';
import { ConfirmDialog } from './ConfirmDialog';

it('keeps a failed confirmation open and allows cancellation', async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  const onConfirm = vi.fn().mockRejectedValue(new Error('Сервис недоступен'));

  renderWithProviders(
    <ConfirmDialog
      open
      title="Удалить запись?"
      description="Действие нельзя отменить."
      confirmLabel="Удалить"
      destructive
      errorMessage={(error) =>
        error instanceof Error ? error.message : 'Неизвестная ошибка'
      }
      onClose={onClose}
      onConfirm={onConfirm}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'Удалить' }));
  expect(await screen.findByText('Сервис недоступен')).toBeInTheDocument();
  expect(
    screen.getByRole('dialog', { name: 'Удалить запись?' }),
  ).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Отмена' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Сервис недоступен')).not.toBeInTheDocument();
});
