import { act, render, screen, waitFor, within } from '@testing-library/react';
import { App } from '../app/App';

const profile = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'user@taler.local',
  displayName: 'Личный',
  baseCurrency: 'RUB',
  timeZone: 'Europe/Moscow',
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
};

const dashboard = {
  currency: 'RUB',
  months: 6,
  fromMonth: '2026-04-01',
  toMonth: '2026-09-01',
  totals: { income: '1000.0000', expense: '250.0000', balance: '750.0000' },
  expensesByCategory: [
    {
      categoryId: 'groceries',
      categoryName: 'Продукты',
      color: '#EF6C00',
      amount: '250.0000',
    },
  ],
  monthlySeries: [
    { month: '2026-08-01', income: '0.0000', expense: '0.0000' },
    { month: '2026-09-01', income: '1000.0000', expense: '250.0000' },
  ],
  topCategories: [
    {
      categoryId: 'groceries',
      categoryName: 'Продукты',
      color: '#EF6C00',
      amount: '250.0000',
    },
  ],
};

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('DashboardPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('shows loading feedback until the dashboard response arrives', async () => {
    let resolveDashboard: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(response(profile));
      if (input === '/api/v1/dashboard?months=6')
        return new Promise<Response>((resolve) => {
          resolveDashboard = resolve;
        });
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await waitFor(
      () =>
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/v1/dashboard?months=6',
          expect.objectContaining({ credentials: 'include' }),
        ),
      { timeout: 20_000 },
    );
    const loading = await screen.findByRole(
      'status',
      { name: 'Загрузка финансовой сводки' },
      { timeout: 20_000 },
    );
    expect(loading).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Доходы' })).toBeNull();

    await act(async () => resolveDashboard?.(response(dashboard)));
    expect(
      await screen.findByRole('heading', { name: 'Доходы' }),
    ).toBeInTheDocument();
    expect(loading).not.toBeInTheDocument();
  }, 45_000);

  it('loads a typed dashboard and presents its widgets with textual data', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(response(profile));
      if (input === '/api/v1/dashboard?months=6')
        return Promise.resolve(response(dashboard));
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    expect(
      await screen.findByRole('heading', {
        name: 'Финансовая сводка',
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Доходы' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Расходы' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Баланс' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Расходы по категориям', level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Динамика по месяцам', level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Топ категорий' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Продукты — 250/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/dashboard?months=6',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('shows independent empty states for each widget', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(response(profile));
      if (input === '/api/v1/dashboard?months=6')
        return Promise.resolve(
          response({
            ...dashboard,
            totals: { income: '0.0000', expense: '0.0000', balance: '0.0000' },
            expensesByCategory: [],
            monthlySeries: [],
            topCategories: [],
          }),
        );
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Финансовая сводка' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Пока нет доходов и расходов.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Нет расходов по категориям.')).toBeInTheDocument();
    expect(screen.getByText('Нет помесячных данных.')).toBeInTheDocument();
    expect(screen.getByText('Пока нет топ-категорий.')).toBeInTheDocument();
    expect(
      screen.getByText('Для текстовой сводки пока нет данных.'),
    ).toBeInTheDocument();
  });

  it('keeps populated widgets visible when another widget has no data', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(response(profile));
      if (input === '/api/v1/dashboard?months=6')
        return Promise.resolve(
          response({ ...dashboard, expensesByCategory: [], topCategories: [] }),
        );
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Доходы' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Нет расходов по категориям.')).toBeInTheDocument();
    expect(screen.getByText('Пока нет топ-категорий.')).toBeInTheDocument();
    expect(screen.queryByText('Нет помесячных данных.')).toBeNull();
    expect(
      screen.getByRole('img', {
        name: 'Линейный график доходов и расходов по месяцам',
      }),
    ).toBeInTheDocument();
  });

  it('offers a retry after a dashboard request error', async () => {
    let attempts = 0;
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(response(profile));
      if (input === '/api/v1/dashboard?months=6') {
        attempts += 1;
        return Promise.resolve(
          attempts === 1
            ? new Response(
                JSON.stringify({
                  statusCode: 500,
                  code: 'ERROR',
                  message: 'Failed',
                  details: [],
                }),
                { status: 500 },
              )
            : response(dashboard),
        );
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    expect(
      await screen.findByText('Не удалось загрузить финансовую сводку.'),
    ).toBeInTheDocument();
    screen.getByRole('button', { name: 'Повторить' }).click();
    expect(
      await screen.findByRole('heading', { name: 'Доходы' }),
    ).toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it('labels category colors and provides textual data for both charts', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(response(profile));
      if (input === '/api/v1/dashboard?months=6')
        return Promise.resolve(response(dashboard));
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    const legend = await screen.findByRole('list', {
      name: 'Легенда расходов по категориям',
    });
    expect(
      within(legend).getByText(/Продукты: 250,00 RUB/),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('list', { name: 'Расходы по категориям текстом' }),
      ).getByRole('listitem'),
    ).toHaveTextContent('Продукты: 250,00 RUB');
    expect(
      screen.getByRole('heading', { name: 'Данные по месяцам' }),
    ).toBeInTheDocument();
    const monthlyText = screen.getByRole('list', {
      name: 'Динамика по месяцам текстом',
    });
    expect(within(monthlyText).getAllByRole('listitem')).toHaveLength(2);
    expect(within(monthlyText).getAllByRole('listitem')[0]).toHaveTextContent(
      '0,00 RUB',
    );
  });
});
