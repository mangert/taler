import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

const profile = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'user@taler.local',
  displayName: 'Личный',
  baseCurrency: 'EUR',
  timeZone: 'Europe/Amsterdam',
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
};
const category = {
  id: '20000000-0000-4000-8000-000000000003',
  name: 'Продукты',
  icon: 'shopping_cart',
  color: '#EF6C00',
  type: 'EXPENSE',
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
};
const rule = {
  id: '50000000-0000-4000-8000-000000000001',
  categoryId: category.id,
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
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('RecurringTransactionsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('shows an owned rule, its next run, schedule and manual exchange rate', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(jsonResponse(profile));
        if (input.startsWith('/api/v1/categories?'))
          return Promise.resolve(
            jsonResponse({
              items: [category],
              meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
            }),
          );
        if (input.startsWith('/api/v1/recurring-transactions?'))
          return Promise.resolve(
            jsonResponse({
              items: [rule],
              meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
            }),
          );
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/recurring-transactions');
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Повторяющиеся транзакции' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Продукты' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Каждый месяц 31-го числа/)).toBeInTheDocument();
    expect(screen.getByText(/Следующий запуск:/)).toBeInTheDocument();
    expect(
      screen.getByText(/Курс: 1 USD = 0.92000000 EUR/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Курс задаётся вручную/)).toBeInTheDocument();
  });

  it('shows a loading state until the rules response arrives', async () => {
    let resolveRules: (response: Response) => void = () => undefined;
    const pendingRules = new Promise<Response>((resolve) => {
      resolveRules = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(jsonResponse(profile));
        if (input.startsWith('/api/v1/categories?'))
          return Promise.resolve(
            jsonResponse({
              items: [category],
              meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
            }),
          );
        if (input.startsWith('/api/v1/recurring-transactions?'))
          return pendingRules;
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/recurring-transactions');
    render(<App />);

    expect(
      await screen.findByRole('status', {
        name: 'Загрузка повторяющихся транзакций',
      }),
    ).toBeInTheDocument();
    resolveRules(
      jsonResponse({
        items: [rule],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Продукты' }),
    ).toBeInTheDocument();
  });

  it('validates and creates a recurring rule, then refreshes the list', async () => {
    const user = userEvent.setup();
    let items: (typeof rule)[] = [];
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?'))
        return Promise.resolve(
          jsonResponse({
            items: [category],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      if (input.startsWith('/api/v1/recurring-transactions?'))
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
        input === '/api/v1/recurring-transactions' &&
        init?.method === 'POST'
      ) {
        items = [rule];
        return Promise.resolve(jsonResponse(items[0], 201));
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/recurring-transactions');
    render(<App />);

    expect(
      await screen.findByText('Повторяющихся правил пока нет.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Добавить правило' }));
    await user.click(screen.getByRole('button', { name: 'Сохранить правило' }));
    expect(await screen.findByText('Выберите категорию')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Категория' }));
    await user.click(screen.getByRole('option', { name: 'Продукты' }));
    await user.type(screen.getByRole('textbox', { name: 'Сумма' }), '25');
    const currency = screen.getByRole('textbox', { name: 'Валюта' });
    await user.clear(currency);
    await user.type(currency, 'USD');
    expect(
      screen.getByText(/Курс задаётся вручную и не обновляется автоматически/),
    ).toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Курс к EUR' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Курс к EUR' }),
      '0.92',
    );
    await user.type(screen.getByRole('textbox', { name: 'День месяца' }), '31');
    fireEvent.change(screen.getByLabelText('Дата начала'), {
      target: { value: '2028-02-01' },
    });
    await user.click(screen.getByRole('button', { name: 'Сохранить правило' }));

    expect(
      await screen.findByRole('heading', { name: 'Продукты' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/recurring-transactions',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"dayOfMonth":31'),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/recurring-transactions',
      expect.objectContaining({
        body: expect.stringContaining('"exchangeRateToBase":"0.92"'),
      }),
    );
  });

  it('edits a rule and pauses or resumes it through PATCH', async () => {
    const user = userEvent.setup();
    let items = [rule];
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?'))
        return Promise.resolve(
          jsonResponse({
            items: [category],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      if (input.startsWith('/api/v1/recurring-transactions?'))
        return Promise.resolve(
          jsonResponse({
            items: [...items],
            meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          }),
        );
      if (
        input === `/api/v1/recurring-transactions/${rule.id}` &&
        init?.method === 'PATCH'
      ) {
        const change = JSON.parse(String(init.body)) as Record<string, unknown>;
        items = [
          {
            ...items[0],
            ...change,
            amount: change.amount ? '30.0000' : items[0].amount,
          },
        ];
        return Promise.resolve(jsonResponse(items[0]));
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/recurring-transactions');
    render(<App />);

    await user.click(
      await screen.findByRole('button', { name: 'Изменить правило Продукты' }),
    );
    const amount = screen.getByRole('textbox', { name: 'Сумма' });
    await user.clear(amount);
    await user.type(amount, '30');
    await user.click(screen.getByRole('button', { name: 'Сохранить правило' }));
    expect(await screen.findByText(/Расход: 30.0000 USD/)).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Приостановить правило Продукты' }),
    );
    expect(await screen.findByText('Приостановлено')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Возобновить правило Продукты' }),
    );
    expect(await screen.findByText('Активно')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/recurring-transactions/${rule.id}`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/recurring-transactions/${rule.id}`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ isActive: true }),
      }),
    );
  });

  it('keeps the edit dialog open for client and server validation errors', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?'))
        return Promise.resolve(
          jsonResponse({
            items: [category],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      if (input.startsWith('/api/v1/recurring-transactions?'))
        return Promise.resolve(
          jsonResponse({
            items: [rule],
            meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          }),
        );
      if (
        input === `/api/v1/recurring-transactions/${rule.id}` &&
        init?.method === 'PATCH'
      )
        return Promise.resolve(
          jsonResponse(
            {
              statusCode: 400,
              code: 'VALIDATION_ERROR',
              message: 'Некорректное правило',
              details: ['dayOfMonth server validation failed'],
            },
            400,
          ),
        );
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/recurring-transactions');
    render(<App />);

    await user.click(
      await screen.findByRole('button', { name: 'Изменить правило Продукты' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Изменить правило' });
    const day = screen.getByRole('textbox', { name: 'День месяца' });
    const rate = screen.getByRole('textbox', { name: 'Курс к EUR' });
    await user.clear(day);
    await user.type(day, '32');
    await user.clear(rate);
    await user.type(rate, '0');
    fireEvent.change(screen.getByLabelText('Дата окончания'), {
      target: { value: '2028-01-31' },
    });
    await user.click(screen.getByRole('button', { name: 'Сохранить правило' }));

    expect(
      await screen.findByText('Укажите день от 1 до 31'),
    ).toBeInTheDocument();
    expect(screen.getByText('Введите курс больше нуля')).toBeInTheDocument();
    expect(
      screen.getByText('Дата окончания должна быть не раньше даты начала'),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      `/api/v1/recurring-transactions/${rule.id}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(dialog).toBeInTheDocument();

    await user.clear(day);
    await user.type(day, '31');
    await user.clear(rate);
    await user.type(rate, '0.92');
    fireEvent.change(screen.getByLabelText('Дата окончания'), {
      target: { value: '' },
    });
    await user.click(screen.getByRole('button', { name: 'Сохранить правило' }));

    expect(
      await screen.findByText('dayOfMonth server validation failed'),
    ).toBeInTheDocument();
    expect(dialog).toBeInTheDocument();
  });

  it('deletes a rule only after confirmation', async () => {
    const user = userEvent.setup();
    let items = [rule];
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?'))
        return Promise.resolve(
          jsonResponse({
            items: [category],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      if (input.startsWith('/api/v1/recurring-transactions?'))
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
        input === `/api/v1/recurring-transactions/${rule.id}` &&
        init?.method === 'DELETE'
      ) {
        items = [];
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/recurring-transactions');
    render(<App />);

    await user.click(
      await screen.findByRole('button', { name: 'Удалить правило Продукты' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Удалить правило' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(fetchMock).not.toHaveBeenCalledWith(
      `/api/v1/recurring-transactions/${rule.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Удалить правило Продукты' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Удалить окончательно' }),
    );
    expect(
      await screen.findByText('Повторяющихся правил пока нет.'),
    ).toBeInTheDocument();
  });

  it('retries loading rules after a recoverable error', async () => {
    const user = userEvent.setup();
    let requestCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(jsonResponse(profile));
        if (input.startsWith('/api/v1/categories?'))
          return Promise.resolve(
            jsonResponse({
              items: [category],
              meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
            }),
          );
        if (input.startsWith('/api/v1/recurring-transactions?')) {
          requestCount += 1;
          if (requestCount === 1)
            return Promise.resolve(
              jsonResponse({ message: 'Service unavailable' }, 503),
            );
          return Promise.resolve(
            jsonResponse({
              items: [rule],
              meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
            }),
          );
        }
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/recurring-transactions');
    render(<App />);

    expect(
      await screen.findByText('Не удалось загрузить повторяющиеся транзакции.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(
      await screen.findByRole('heading', { name: 'Продукты' }),
    ).toBeInTheDocument();
    expect(requestCount).toBe(2);
  });
});
