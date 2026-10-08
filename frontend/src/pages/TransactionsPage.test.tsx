import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

const profile = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'personal@taler.local',
  displayName: 'Личный',
  baseCurrency: 'RUB',
  timeZone: 'Europe/Moscow',
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

const transaction = {
  id: '30000000-0000-4000-8000-000000000004',
  categoryId: category.id,
  type: 'EXPENSE',
  amount: '125.5000',
  currency: 'RUB',
  exchangeRateToBase: '1.00000000',
  baseAmount: '125.5000',
  transactionDate: '2026-09-21',
  description: 'Coffee',
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('TransactionsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('opens an owned transaction selected by an audit link', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?'))
        return Promise.resolve(
          jsonResponse({
            items: [category],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      if (input.startsWith('/api/v1/transactions?'))
        return Promise.resolve(
          jsonResponse({
            items: [],
            meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
          }),
        );
      if (input === `/api/v1/transactions/${transaction.id}`)
        return Promise.resolve(jsonResponse(transaction));
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(
      {},
      '',
      `/transactions?transactionId=${transaction.id}`,
    );

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Выбранная транзакция' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Coffee')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/transactions/${transaction.id}`,
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('retries a failed selected transaction request without claiming it was deleted', async () => {
    const user = userEvent.setup();
    let detailAttempts = 0;
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
        if (input.startsWith('/api/v1/transactions?'))
          return Promise.resolve(
            jsonResponse({
              items: [],
              meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
            }),
          );
        if (input === `/api/v1/transactions/${transaction.id}`) {
          detailAttempts += 1;
          return detailAttempts === 1
            ? Promise.reject(new Error('Network unavailable'))
            : Promise.resolve(jsonResponse(transaction));
        }
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState(
      {},
      '',
      `/transactions?transactionId=${transaction.id}`,
    );

    render(<App />);

    expect(
      await screen.findByText('Не удалось загрузить транзакцию.'),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Повторить загрузку' }),
    );
    expect(await screen.findByText('Coffee')).toBeInTheDocument();
  });

  it('restores URL filters and shows the owned transactions', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?')) {
        return Promise.resolve(
          jsonResponse({
            items: [category],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      }
      if (input.startsWith('/api/v1/transactions?')) {
        return Promise.resolve(
          jsonResponse({
            items: [transaction],
            meta: { page: 2, pageSize: 20, total: 21, totalPages: 2 },
          }),
        );
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/transactions?search=Coffee&page=2');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Транзакции' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('cell', { name: 'Coffee' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Coffee' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('search=Coffee'),
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('page=2'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('combines URL filters, resets the page and clears filters', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?')) {
        return Promise.resolve(
          jsonResponse({
            items: [category],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      }
      if (input.startsWith('/api/v1/transactions?')) {
        return Promise.resolve(
          jsonResponse({
            items: [transaction],
            meta: { page: 2, pageSize: 20, total: 21, totalPages: 2 },
          }),
        );
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/transactions?page=2');
    render(<App />);

    await screen.findAllByText(/Coffee/);
    await user.type(
      screen.getByRole('textbox', { name: 'Поиск по описанию' }),
      'Rent',
    );
    fireEvent.change(screen.getByLabelText('Дата с'), {
      target: { value: '2026-09-01' },
    });
    fireEvent.change(screen.getByLabelText('Сумма от'), {
      target: { value: '100' },
    });

    await waitFor(() => {
      const query = new URLSearchParams(window.location.search);
      expect(query.get('search')).toBe('Rent');
      expect(query.get('dateFrom')).toBe('2026-09-01');
      expect(query.get('minAmount')).toBe('100');
      expect(query.has('page')).toBe(false);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('minAmount=100'),
      expect.objectContaining({ credentials: 'include' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Убрать фильтр Поиск: Rent' }),
    );
    expect(new URLSearchParams(window.location.search).has('search')).toBe(
      false,
    );
    expect(new URLSearchParams(window.location.search).get('minAmount')).toBe(
      '100',
    );
    await user.click(screen.getByRole('button', { name: 'Сбросить фильтры' }));
    expect(window.location.search).toBe('');
  });

  it('shows transaction table and card list and keeps filters when changing page', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?')) {
        return Promise.resolve(
          jsonResponse({
            items: [category],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      }
      if (input.startsWith('/api/v1/transactions?')) {
        return Promise.resolve(
          jsonResponse({
            items: [transaction],
            meta: { page: 1, pageSize: 20, total: 21, totalPages: 2 },
          }),
        );
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/transactions?type=EXPENSE');
    render(<App />);

    expect(
      await screen.findByRole('table', { name: 'Транзакции' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Дата' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'Карточки транзакций' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
    expect(new URLSearchParams(window.location.search).get('page')).toBe('2');
    expect(new URLSearchParams(window.location.search).get('type')).toBe(
      'EXPENSE',
    );
  });

  it('validates and creates a transaction in the base currency', async () => {
    const user = userEvent.setup();
    const records: (typeof transaction)[] = [];
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?')) {
        return Promise.resolve(
          jsonResponse({
            items: [category],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      }
      if (input.startsWith('/api/v1/transactions?')) {
        return Promise.resolve(
          jsonResponse({
            items: [...records],
            meta: {
              page: 1,
              pageSize: 20,
              total: records.length,
              totalPages: 1,
            },
          }),
        );
      }
      if (input === '/api/v1/transactions' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as Record<string, string>;
        records.push({
          ...transaction,
          amount: body.amount,
          transactionDate: body.transactionDate,
          description: body.description,
        });
        return Promise.resolve(jsonResponse(records[0], 201));
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/transactions');
    render(<App />);

    await screen.findByText('У вас пока нет транзакций.');
    await user.click(
      screen.getByRole('button', { name: 'Добавить транзакцию' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Новая транзакция' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'Курс к основной валюте' }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Сохранить транзакцию' }),
    );
    expect(await screen.findByText('Введите сумму')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Сумма' }), '23.50');
    fireEvent.change(screen.getByLabelText('Дата транзакции'), {
      target: { value: '2026-09-22' },
    });
    await user.click(
      screen.getByRole('combobox', { name: 'Категория транзакции' }),
    );
    await user.click(screen.getByRole('option', { name: 'Продукты' }));
    await user.type(screen.getByRole('textbox', { name: 'Описание' }), 'Lunch');
    await user.click(
      screen.getByRole('button', { name: 'Сохранить транзакцию' }),
    );

    expect(await screen.findAllByText('Lunch')).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/transactions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          categoryId: category.id,
          type: 'EXPENSE',
          amount: '23.50',
          currency: 'RUB',
          exchangeRateToBase: '1',
          transactionDate: '2026-09-22',
          description: 'Lunch',
        }),
      }),
    );
  });

  it('deletes a transaction only after confirmation', async () => {
    const user = userEvent.setup();
    let records = [transaction];
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?')) {
        return Promise.resolve(
          jsonResponse({
            items: [category],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      }
      if (input.startsWith('/api/v1/transactions?')) {
        return Promise.resolve(
          jsonResponse({
            items: records,
            meta: {
              page: 1,
              pageSize: 20,
              total: records.length,
              totalPages: 1,
            },
          }),
        );
      }
      if (
        input === `/api/v1/transactions/${transaction.id}` &&
        init?.method === 'DELETE'
      ) {
        records = [];
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/transactions');
    render(<App />);

    await screen.findByRole('table', { name: 'Транзакции' });
    await user.click(
      screen.getAllByRole('button', { name: 'Удалить транзакцию Coffee' })[0],
    );
    expect(
      screen.getByRole('dialog', { name: 'Удалить транзакцию' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(fetchMock).not.toHaveBeenCalledWith(
      `/api/v1/transactions/${transaction.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
    await user.click(
      screen.getAllByRole('button', { name: 'Удалить транзакцию Coffee' })[0],
    );
    await user.click(
      screen.getByRole('button', { name: 'Удалить окончательно' }),
    );
    expect(
      await screen.findByText('У вас пока нет транзакций.'),
    ).toBeInTheDocument();
  });

  it('edits a transaction and shows the manual rate for a foreign currency', async () => {
    const user = userEvent.setup();
    let current = transaction;
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?')) {
        return Promise.resolve(
          jsonResponse({
            items: [category],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      }
      if (input.startsWith('/api/v1/transactions?')) {
        return Promise.resolve(
          jsonResponse({
            items: [current],
            meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          }),
        );
      }
      if (
        input === `/api/v1/transactions/${transaction.id}` &&
        init?.method === 'PATCH'
      ) {
        current = {
          ...current,
          ...(JSON.parse(String(init.body)) as typeof transaction),
        };
        return Promise.resolve(jsonResponse(current));
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/transactions');
    render(<App />);

    await screen.findByRole('table', { name: 'Транзакции' });
    await user.click(
      screen.getAllByRole('button', { name: 'Изменить транзакцию Coffee' })[0],
    );
    expect(
      screen.getByRole('dialog', { name: 'Изменить транзакцию' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Сумма' })).toHaveValue(
      '125.5000',
    );
    const currency = screen.getByRole('textbox', { name: 'Валюта' });
    await user.clear(currency);
    await user.type(currency, 'USD');
    const rate = await screen.findByRole('textbox', {
      name: 'Курс к основной валюте',
    });
    await user.clear(rate);
    await user.type(rate, '0.25');
    await user.click(
      screen.getByRole('button', { name: 'Сохранить транзакцию' }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/v1/transactions/${transaction.id}`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            categoryId: category.id,
            type: 'EXPENSE',
            amount: '125.5000',
            currency: 'USD',
            exchangeRateToBase: '0.25',
            transactionDate: '2026-09-21',
            description: 'Coffee',
          }),
        }),
      );
    });
    expect(await screen.findAllByText(/^−125,50\s*\$$/)).toHaveLength(2);
  });

  it('loads category options beyond the first category page', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?')) {
        const page = new URL(input, 'http://localhost').searchParams.get(
          'page',
        );
        return Promise.resolve(
          jsonResponse({
            items: page === '2' ? [category] : [],
            meta: {
              page: Number(page),
              pageSize: 100,
              total: 101,
              totalPages: 2,
            },
          }),
        );
      }
      if (input.startsWith('/api/v1/transactions?')) {
        return Promise.resolve(
          jsonResponse({
            items: [transaction],
            meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          }),
        );
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/transactions');
    render(<App />);

    expect(
      await screen.findByRole('cell', { name: 'Продукты' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('page=2'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('distinguishes an empty filtered result from an empty account', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?')) {
        return Promise.resolve(
          jsonResponse({
            items: [category],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      }
      if (input.startsWith('/api/v1/transactions?')) {
        return Promise.resolve(
          jsonResponse({
            items: [],
            meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
          }),
        );
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/transactions?search=unknown');
    render(<App />);

    expect(
      await screen.findByText('По вашим фильтрам транзакции не найдены.'),
    ).toBeInTheDocument();
  });

  it('shows a recoverable loading error', async () => {
    const user = userEvent.setup();
    let fail = true;
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?')) {
        return Promise.resolve(
          jsonResponse({
            items: [category],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      }
      if (input.startsWith('/api/v1/transactions?')) {
        return fail
          ? Promise.reject(new Error('Network unavailable'))
          : Promise.resolve(
              jsonResponse({
                items: [transaction],
                meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
              }),
            );
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/transactions');
    render(<App />);

    expect(
      await screen.findByRole('status', { name: 'Загрузка транзакций' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Не удалось загрузить транзакции.'),
    ).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(
      await screen.findByRole('table', { name: 'Транзакции' }),
    ).toBeInTheDocument();
  });

  it('restores every list filter and pagination value from the URL', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?'))
        return Promise.resolve(
          jsonResponse({
            items: [category],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      if (input.startsWith('/api/v1/transactions?'))
        return Promise.resolve(
          jsonResponse({
            items: [transaction],
            meta: { page: 2, pageSize: 20, total: 21, totalPages: 2 },
          }),
        );
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(
      {},
      '',
      `/transactions?search=Coffee&dateFrom=2026-09-01&dateTo=2026-09-30&categoryId=${category.id}&minAmount=10&maxAmount=200&type=EXPENSE&page=2`,
    );
    render(<App />);

    await screen.findByRole('table', { name: 'Транзакции' });
    const transactionRequest = fetchMock.mock.calls.find(([input]) =>
      input.startsWith('/api/v1/transactions?'),
    )?.[0];
    expect(transactionRequest).toBeDefined();
    const params = new URL(transactionRequest ?? '', 'http://localhost')
      .searchParams;
    for (const [key, value] of Object.entries({
      search: 'Coffee',
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
      categoryId: category.id,
      minAmount: '10',
      maxAmount: '200',
      type: 'EXPENSE',
      page: '2',
      pageSize: '20',
    }))
      expect(params.get(key)).toBe(value);
    expect(
      screen.getByRole('textbox', { name: 'Поиск по описанию' }),
    ).toHaveValue('Coffee');
    expect(screen.getByLabelText('Дата с')).toHaveValue('2026-09-01');
    expect(screen.getByLabelText('Дата по')).toHaveValue('2026-09-30');
    expect(
      await screen.findByRole('button', {
        name: 'Убрать фильтр Категория: Продукты',
      }),
    ).toBeInTheDocument();
  });

  it('downloads CSV with current URL filters but without pagination', async () => {
    const user = userEvent.setup();
    const BrowserURL = URL;
    class DownloadURL extends BrowserURL {
      static createObjectURL = vi.fn(() => 'blob:transactions');
      static revokeObjectURL = vi.fn();
    }
    vi.stubGlobal('URL', DownloadURL);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?'))
        return Promise.resolve(
          jsonResponse({
            items: [category],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      if (input.startsWith('/api/v1/transactions?'))
        return Promise.resolve(
          jsonResponse({
            items: [transaction],
            meta: { page: 3, pageSize: 20, total: 41, totalPages: 3 },
          }),
        );
      if (input.startsWith('/api/v1/transactions/export?'))
        return Promise.resolve(
          new Response('transactionDate,amount\n2026-09-21,125.50\n', {
            headers: { 'Content-Type': 'text/csv' },
          }),
        );
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(
      {},
      '',
      `/transactions?search=Coffee&dateFrom=2026-09-01&categoryId=${category.id}&type=EXPENSE&page=3`,
    );
    render(<App />);

    await screen.findByRole('table', { name: 'Транзакции' });
    await user.click(screen.getByRole('button', { name: 'Экспорт CSV' }));

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    const exportRequest = fetchMock.mock.calls.find(([input]) =>
      input.startsWith('/api/v1/transactions/export?'),
    )?.[0];
    expect(exportRequest).toBeDefined();
    const params = new BrowserURL(exportRequest ?? '', 'http://localhost')
      .searchParams;
    expect(params.get('search')).toBe('Coffee');
    expect(params.get('dateFrom')).toBe('2026-09-01');
    expect(params.get('categoryId')).toBe(category.id);
    expect(params.get('type')).toBe('EXPENSE');
    expect(params.has('page')).toBe(false);
    expect(params.has('pageSize')).toBe(false);
    expect(DownloadURL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(DownloadURL.revokeObjectURL).toHaveBeenCalledWith(
      'blob:transactions',
    );
  });

  it('shows a recoverable error when CSV export fails', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?'))
        return Promise.resolve(
          jsonResponse({
            items: [category],
            meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        );
      if (input.startsWith('/api/v1/transactions?'))
        return Promise.resolve(
          jsonResponse({
            items: [],
            meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
          }),
        );
      if (input.startsWith('/api/v1/transactions/export?'))
        return Promise.resolve(
          jsonResponse(
            {
              statusCode: 500,
              code: 'EXPORT_FAILED',
              message: 'Export failed',
              details: [],
            },
            500,
          ),
        );
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/transactions');
    render(<App />);

    await screen.findByText('У вас пока нет транзакций.');
    await user.click(screen.getByRole('button', { name: 'Экспорт CSV' }));
    expect(
      await screen.findByText(
        'Не удалось экспортировать CSV. Повторите попытку.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Экспорт CSV' })).toBeEnabled();
  });

  it('keeps the create dialog open and focuses a server-invalid field', async () => {
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
      if (input.startsWith('/api/v1/transactions?'))
        return Promise.resolve(
          jsonResponse({
            items: [],
            meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
          }),
        );
      if (input === '/api/v1/transactions' && init?.method === 'POST')
        return Promise.resolve(
          jsonResponse(
            {
              statusCode: 400,
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: ['amount exceeds account limit'],
            },
            400,
          ),
        );
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/transactions');
    render(<App />);

    await screen.findByText('У вас пока нет транзакций.');
    await user.click(
      screen.getByRole('button', { name: 'Добавить транзакцию' }),
    );
    await user.type(screen.getByRole('textbox', { name: 'Сумма' }), '23.50');
    fireEvent.change(screen.getByLabelText('Дата транзакции'), {
      target: { value: '2026-09-22' },
    });
    await user.click(
      screen.getByRole('combobox', { name: 'Категория транзакции' }),
    );
    await user.click(screen.getByRole('option', { name: 'Продукты' }));
    await user.click(
      screen.getByRole('button', { name: 'Сохранить транзакцию' }),
    );

    expect(
      await screen.findByText('amount exceeds account limit'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: 'Новая транзакция' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Сумма' })).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/transactions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('allows retrying a failed delete without losing the transaction', async () => {
    const user = userEvent.setup();
    let deleteAttempts = 0;
    let records = [transaction];
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
      if (input.startsWith('/api/v1/transactions?'))
        return Promise.resolve(
          jsonResponse({
            items: records,
            meta: {
              page: 1,
              pageSize: 20,
              total: records.length,
              totalPages: records.length ? 1 : 0,
            },
          }),
        );
      if (
        input === `/api/v1/transactions/${transaction.id}` &&
        init?.method === 'DELETE'
      ) {
        deleteAttempts += 1;
        if (deleteAttempts === 1)
          return Promise.resolve(
            jsonResponse(
              {
                statusCode: 500,
                code: 'DELETE_FAILED',
                message: 'Delete failed',
                details: [],
              },
              500,
            ),
          );
        records = [];
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/transactions');
    render(<App />);

    await screen.findByRole('table', { name: 'Транзакции' });
    await user.click(
      screen.getAllByRole('button', { name: 'Удалить транзакцию Coffee' })[0],
    );
    await user.click(
      screen.getByRole('button', { name: 'Удалить окончательно' }),
    );
    expect(
      await screen.findByText(
        'Не удалось удалить транзакцию. Попробуйте ещё раз.',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(
      await screen.findByRole('cell', { name: 'Coffee' }),
    ).toBeInTheDocument();
    await user.click(
      screen.getAllByRole('button', { name: 'Удалить транзакцию Coffee' })[0],
    );
    await user.click(
      screen.getByRole('button', { name: 'Удалить окончательно' }),
    );
    expect(
      await screen.findByText('У вас пока нет транзакций.'),
    ).toBeInTheDocument();
    expect(deleteAttempts).toBe(2);
  });
});
