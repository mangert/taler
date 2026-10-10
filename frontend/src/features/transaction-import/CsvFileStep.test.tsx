import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/render-with-providers';
import { CsvFileStep } from './CsvFileStep';

it('explains the upload control and its error to keyboard users', async () => {
  const user = userEvent.setup();
  renderWithProviders(
    <CsvFileStep
      file={null}
      pending={false}
      error="Файл должен иметь формат CSV."
      onSelect={vi.fn()}
    />,
  );

  const dropZone = screen.getByRole('button', { name: 'Зона загрузки CSV' });
  await user.tab();
  expect(dropZone).toHaveFocus();
  expect(dropZone).toHaveAccessibleDescription(
    'Перетащите CSV-файл сюда или нажмите, чтобы выбрать Файл должен иметь формат CSV.',
  );
});
