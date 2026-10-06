import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
const groceries = {
  id: '20000000-0000-4000-8000-000000000003',
  name: 'Продукты',
  icon: 'shopping_cart',
  color: '#EF6C00',
  type: 'EXPENSE',
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
};
const budget = {
  id: '30000000-0000-4000-8000-000000000001',
  categoryId: groceries.id,
  month: '2026-09-01',
  limitAmount: '500.0000',
  currency: 'RUB',
  spentAmount: '125.0000',
  remainingAmount: '375.0000',
  progressPercent: 25,
  isExceeded: false,
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('BudgetsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('shows the selected month budget with its limit, spending, remainder and progress', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/budgets?'))
        return Promise.resolve(
          jsonResponse({
            items: [budget],
            meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          }),
        );
      if (input.startsWith('/api/v1/categories?'))
        return Promise.resolve(
          jsonResponse({
            items: [groceries],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/budgets?month=2026-09-01');
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: 'Бюджеты' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Продукты' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Лимит:.*500/)).toBeInTheDocument();
    expect(screen.getByText(/Расход:.*125/)).toBeInTheDocument();
    expect(screen.getByText(/Остаток:.*375/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '25',
    );
  });

  it('validates and creates a budget, then refreshes the list', async () => {
    const user = userEvent.setup();
    const budgets: (typeof budget)[] = [];
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?'))
        return Promise.resolve(
          jsonResponse({
            items: [groceries],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      if (input.startsWith('/api/v1/budgets?'))
        return Promise.resolve(
          jsonResponse({
            items: [...budgets],
            meta: {
              page: 1,
              pageSize: 20,
              total: budgets.length,
              totalPages: budgets.length ? 1 : 0,
            },
          }),
        );
      if (input === '/api/v1/budgets' && init?.method === 'POST') {
        budgets.push(budget);
        return Promise.resolve(jsonResponse(budget, 201));
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/budgets?month=2026-09-01');
    render(<App />);

    expect(
      await screen.findByText('На этот месяц бюджетов пока нет.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Добавить бюджет' }));
    await user.click(screen.getByRole('button', { name: 'Сохранить бюджет' }));
    expect(await screen.findByText('Выберите категорию')).toBeInTheDocument();
    await user.click(
      screen.getByRole('combobox', { name: 'Категория расходов' }),
    );
    await user.click(screen.getByRole('option', { name: 'Продукты' }));
    await user.type(screen.getByRole('textbox', { name: 'Лимит' }), '500');
    await user.click(screen.getByRole('button', { name: 'Сохранить бюджет' }));

    expect(
      await screen.findByRole('heading', { name: 'Продукты' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/budgets',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          categoryId: groceries.id,
          month: '2026-09-01',
          limitAmount: '500',
        }),
      }),
    );
  });

  it('navigates to the saved month when creating a budget for another month', async () => {
    const user = userEvent.setup();
    const octoberBudget = { ...budget, month: '2026-10-01' };
    let created = false;
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?'))
        return Promise.resolve(
          jsonResponse({
            items: [groceries],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      if (input.startsWith('/api/v1/budgets?')) {
        const selected = new URL(input, 'http://localhost').searchParams.get(
          'month',
        );
        const items =
          created && selected === '2026-10-01' ? [octoberBudget] : [];
        return Promise.resolve(
          jsonResponse({
            items,
            meta: {
              page: 1,
              pageSize: 20,
              total: items.length,
              totalPages: items.length ? 1 : 0,
            },
          }),
        );
      }
      if (input === '/api/v1/budgets' && init?.method === 'POST') {
        created = true;
        return Promise.resolve(jsonResponse(octoberBudget, 201));
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/budgets?month=2026-09-01');
    render(<App />);

    await screen.findByText('На этот месяц бюджетов пока нет.');
    await user.click(screen.getByRole('button', { name: 'Добавить бюджет' }));
    await user.click(
      screen.getByRole('combobox', { name: 'Категория расходов' }),
    );
    await user.click(screen.getByRole('option', { name: 'Продукты' }));
    fireEvent.change(screen.getByLabelText('Месяц бюджета'), {
      target: { value: '2026-10' },
    });
    await user.type(screen.getByRole('textbox', { name: 'Лимит' }), '500');
    await user.click(screen.getByRole('button', { name: 'Сохранить бюджет' }));
    expect(
      await screen.findByRole('heading', { name: 'Продукты' }),
    ).toBeInTheDocument();
    expect(window.location.search).toContain('month=2026-10-01');
  });

  it('edits a budget and deletes it only after confirmation', async () => {
    const user = userEvent.setup();
    let items = [budget];
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?'))
        return Promise.resolve(
          jsonResponse({
            items: [groceries],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      if (input.startsWith('/api/v1/budgets?'))
        return Promise.resolve(
          jsonResponse({
            items: [...items],
            meta: {
              page: 1,
              pageSize: 20,
              total: items.length,
              totalPages: items.length ? 1 : 0,
            },
          }),
        );
      if (
        input === `/api/v1/budgets/${budget.id}` &&
        init?.method === 'PATCH'
      ) {
        items = [
          { ...budget, limitAmount: '600.0000', remainingAmount: '475.0000' },
        ];
        return Promise.resolve(jsonResponse(items[0]));
      }
      if (
        input === `/api/v1/budgets/${budget.id}` &&
        init?.method === 'DELETE'
      ) {
        items = [];
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/budgets?month=2026-09-01');
    render(<App />);

    await user.click(
      await screen.findByRole('button', { name: 'Изменить бюджет Продукты' }),
    );
    const limit = screen.getByRole('textbox', { name: 'Лимит' });
    await user.clear(limit);
    await user.type(limit, '600');
    await user.click(screen.getByRole('button', { name: 'Сохранить бюджет' }));
    expect(await screen.findByText(/Лимит:.*600/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/budgets/${budget.id}`,
      expect.objectContaining({ method: 'PATCH' }),
    );

    await user.click(
      screen.getByRole('button', { name: 'Удалить бюджет Продукты' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Удалить бюджет' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(fetchMock).not.toHaveBeenCalledWith(
      `/api/v1/budgets/${budget.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Удалить бюджет Продукты' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Удалить окончательно' }),
    );
    expect(
      await screen.findByText('На этот месяц бюджетов пока нет.'),
    ).toBeInTheDocument();
  });

  it('shows exceeded and no-spending states while switching months', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?'))
        return Promise.resolve(
          jsonResponse({
            items: [groceries],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      if (input.startsWith('/api/v1/budgets?')) {
        const month = new URL(input, 'http://localhost').searchParams.get(
          'month',
        );
        const selected =
          month === '2026-09-01'
            ? {
                ...budget,
                spentAmount: '625.0000',
                remainingAmount: '-125.0000',
                progressPercent: 125,
                isExceeded: true,
              }
            : {
                ...budget,
                month: '2026-10-01',
                spentAmount: '0.0000',
                remainingAmount: '500.0000',
                progressPercent: 0,
              };
        return Promise.resolve(
          jsonResponse({
            items: [selected],
            meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          }),
        );
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/budgets?month=2026-09-01');
    render(<App />);

    expect(
      await screen.findByText(/125% от лимита — лимит превышен/),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      '125% от лимита — лимит превышен',
    );
    expect(screen.getByRole('progressbar')).toHaveAccessibleDescription(
      '125% от лимита — лимит превышен',
    );
    expect(screen.getByText(/Остаток:.*-125/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Следующий месяц' }));
    expect(
      await screen.findByText('В этом месяце расходов пока нет.'),
    ).toBeInTheDocument();
    expect(window.location.search).toContain('month=2026-10-01');
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });

  it('shows a recoverable loading error', async () => {
    const user = userEvent.setup();
    let fail = true;
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?'))
        return Promise.resolve(
          jsonResponse({
            items: [groceries],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      if (input.startsWith('/api/v1/budgets?')) {
        if (fail) return Promise.reject(new Error('Network unavailable'));
        return Promise.resolve(
          jsonResponse({
            items: [budget],
            meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          }),
        );
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/budgets?month=2026-09-01');
    render(<App />);

    expect(
      await screen.findByRole('status', { name: 'Загрузка бюджетов' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Не удалось загрузить бюджеты.'),
    ).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(
      await screen.findByRole('heading', { name: 'Продукты' }),
    ).toBeInTheDocument();
  });
});
