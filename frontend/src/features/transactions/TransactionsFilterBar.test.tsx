import {
  render,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { appTheme } from '../../app/theme';
import { TransactionsFilterBar } from './TransactionsFilterBar';

afterEach(() => vi.unstubAllGlobals());

it('keeps category and dates available and opens advanced filters in a mobile drawer', async () => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  const user = userEvent.setup();
  const onChange = vi.fn();

  render(
    <ThemeProvider theme={appTheme}>
      <TransactionsFilterBar
        filters={{
          search: '',
          dateFrom: '',
          dateTo: '',
          categoryId: '',
          minAmount: '',
          maxAmount: '',
          type: '',
          page: 1,
          pageSize: 20,
        }}
        categories={[]}
        onChange={onChange}
        onReset={vi.fn()}
      />
    </ThemeProvider>,
  );

  expect(
    screen.getByRole('combobox', { name: 'Категория' }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Дата с')).toBeInTheDocument();
  expect(screen.getByLabelText('Дата по')).toBeInTheDocument();
  expect(
    screen.queryByRole('textbox', { name: 'Поиск по описанию' }),
  ).not.toBeInTheDocument();

  await user.click(
    screen.getByRole('button', { name: 'Дополнительные фильтры' }),
  );
  const drawer = screen.getByRole('dialog', { name: 'Дополнительные фильтры' });
  expect(drawer).toBeInTheDocument();
  await user.type(
    screen.getByRole('textbox', { name: 'Поиск по описанию' }),
    'Кофе',
  );
  expect(onChange).toHaveBeenCalledWith('search', 'К');
  await user.click(screen.getByRole('button', { name: 'Закрыть фильтры' }));
  await waitForElementToBeRemoved(() =>
    screen.queryByRole('dialog', { name: 'Дополнительные фильтры' }),
  );
});
