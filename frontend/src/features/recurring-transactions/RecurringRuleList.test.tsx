import { ThemeProvider } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
import { appTheme } from '../../app/theme';
import type { RecurringRule } from '../../shared/api/recurring-transactions';
import { RecurringRuleList } from './RecurringRuleList';

const rule = {
  id: '50000000-0000-4000-8000-000000000001',
  categoryId: '20000000-0000-4000-8000-000000000003',
  type: 'EXPENSE',
  amount: '25.0000',
  currency: 'USD',
  exchangeRateToBase: '0.92000000',
  description: 'Покупки',
  dayOfMonth: 31,
  startDate: '2028-02-01',
  endDate: null,
  nextRunAt: '2028-02-28T23:00:00.000Z',
  isActive: true,
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
} satisfies RecurringRule;
const pausedRule = {
  ...rule,
  id: '50000000-0000-4000-8000-000000000002',
  categoryId: '20000000-0000-4000-8000-000000000004',
  isActive: false,
} satisfies RecurringRule;

const props = {
  rules: [rule],
  categoryNames: new Map([[rule.categoryId, 'Продукты']]),
  baseCurrency: 'EUR',
  timeZone: 'Europe/Amsterdam',
  onEdit: vi.fn(),
  onToggle: vi.fn(),
  onDelete: vi.fn(),
  togglingId: null,
};

function setDesktopViewport(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width:1200px'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  }));
}

function setMediumViewport(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width:900px'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  }));
}

afterEach(() => vi.unstubAllGlobals());

it('shows a compact rules table on desktop and cards on mobile', () => {
  setDesktopViewport();
  const view = render(
    <ThemeProvider theme={appTheme}>
      <RecurringRuleList {...props} />
    </ThemeProvider>,
  );

  expect(
    screen.getByRole('table', { name: 'Повторяющиеся правила' }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('article')).not.toBeInTheDocument();

  view.unmount();
  vi.unstubAllGlobals();
  render(
    <ThemeProvider theme={appTheme}>
      <RecurringRuleList {...props} />
    </ThemeProvider>,
  );
  expect(screen.getByRole('article')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

it('keeps cards at medium widths where the table would be cramped', () => {
  setMediumViewport();
  render(
    <ThemeProvider theme={appTheme}>
      <RecurringRuleList {...props} />
    </ThemeProvider>,
  );
  expect(screen.getByRole('article')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

it('pairs active and paused status text with accessible icons in both layouts', () => {
  const statusProps = {
    ...props,
    rules: [rule, pausedRule],
    categoryNames: new Map([
      [rule.categoryId, 'Продукты'],
      [pausedRule.categoryId, 'Аренда'],
    ]),
  };
  setDesktopViewport();
  const view = render(
    <ThemeProvider theme={appTheme}>
      <RecurringRuleList {...statusProps} />
    </ThemeProvider>,
  );
  expect(screen.getByText('Активно')).toBeInTheDocument();
  expect(screen.getByText('Приостановлено')).toBeInTheDocument();
  expect(
    screen.getByRole('img', { name: 'Активное правило' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('img', { name: 'Приостановленное правило' }),
  ).toBeInTheDocument();

  view.unmount();
  vi.unstubAllGlobals();
  render(
    <ThemeProvider theme={appTheme}>
      <RecurringRuleList {...statusProps} />
    </ThemeProvider>,
  );
  expect(
    screen.getByRole('img', { name: 'Активное правило' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('img', { name: 'Приостановленное правило' }),
  ).toBeInTheDocument();
});

it('shows the next run at local midnight with the user timezone in both layouts', () => {
  setDesktopViewport();
  const view = render(
    <ThemeProvider theme={appTheme}>
      <RecurringRuleList {...props} />
    </ThemeProvider>,
  );
  expect(screen.getByText(/29 февраля 2028 г. в 00:00/)).toBeInTheDocument();
  expect(
    screen.getByText('Часовой пояс: Europe/Amsterdam'),
  ).toBeInTheDocument();

  view.unmount();
  vi.unstubAllGlobals();
  render(
    <ThemeProvider theme={appTheme}>
      <RecurringRuleList {...props} timeZone="America/New_York" />
    </ThemeProvider>,
  );
  expect(screen.getByText(/28 февраля 2028 г. в 18:00/)).toBeInTheDocument();
  expect(
    screen.getByText('Часовой пояс: America/New_York'),
  ).toBeInTheDocument();
});

it('keeps destructive deletion separate from pause in both layouts', () => {
  function expectSeparatedActions(): void {
    const safeActions = screen.getByRole('group', {
      name: 'Управление правилом Продукты',
    });
    const deleteActions = screen.getByRole('group', {
      name: 'Удаление правила Продукты',
    });
    expect(
      within(safeActions).getByRole('button', {
        name: 'Приостановить правило Продукты',
      }),
    ).toBeInTheDocument();
    expect(
      within(safeActions).queryByRole('button', {
        name: 'Удалить правило Продукты',
      }),
    ).not.toBeInTheDocument();
    expect(
      within(deleteActions).getByRole('button', {
        name: 'Удалить правило Продукты',
      }),
    ).toBeInTheDocument();
  }

  setDesktopViewport();
  const view = render(
    <ThemeProvider theme={appTheme}>
      <RecurringRuleList {...props} />
    </ThemeProvider>,
  );
  expectSeparatedActions();

  view.unmount();
  vi.unstubAllGlobals();
  render(
    <ThemeProvider theme={appTheme}>
      <RecurringRuleList {...props} />
    </ThemeProvider>,
  );
  expectSeparatedActions();
});
