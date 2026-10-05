import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import type { AuditEntry } from '../shared/api/audit';

const profile = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'personal@taler.local',
  displayName: 'Личный',
  baseCurrency: 'RUB',
  timeZone: 'Europe/Moscow',
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
};

const transactionId = '30000000-0000-4000-8000-000000000004';
const entry: AuditEntry = {
  id: '40000000-0000-4000-8000-000000000005',
  entityType: 'TRANSACTION',
  entityId: transactionId,
  action: 'UPDATE',
  before: {
    id: transactionId,
    description: 'Кофе',
    amount: '100.0000',
    currency: 'RUB',
  },
  after: {
    id: transactionId,
    description: 'Обед',
    amount: '125.0000',
    currency: 'RUB',
  },
  createdAt: '2026-09-21T10:00:00.000Z',
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function list(items: AuditEntry[], page = 1, total = items.length) {
  return {
    items,
    meta: { page, pageSize: 20, total, totalPages: Math.ceil(total / 20) },
  };
}

describe('AuditLogPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('refreshes the cached audit list after deleting a transaction', async () => {
    const user = userEvent.setup();
    const transaction = {
      id: transactionId,
      categoryId: '20000000-0000-4000-8000-000000000003',
      type: 'EXPENSE',
      amount: '125.0000',
      currency: 'RUB',
      exchangeRateToBase: '1.00000000',
      baseAmount: '125.0000',
      transactionDate: '2026-09-21',
      description: 'Обед',
      createdAt: '2026-09-21T10:00:00.000Z',
      updatedAt: '2026-09-21T10:00:00.000Z',
    };
    const category = {
      id: transaction.categoryId,
      name: 'Еда',
      icon: 'restaurant',
      color: '#EF6C00',
      type: 'EXPENSE',
      createdAt: '2026-09-21T10:00:00.000Z',
      updatedAt: '2026-09-21T10:00:00.000Z',
    };
    let auditItems: AuditEntry[] = [];
    let transactions = [transaction];
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string, init?: RequestInit) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(response(profile));
        if (input.startsWith('/api/v1/audit-log?'))
          return Promise.resolve(response(list(auditItems)));
        if (input.startsWith('/api/v1/categories?'))
          return Promise.resolve(
            response({
              items: [category],
              meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
            }),
          );
        if (input.startsWith('/api/v1/transactions?'))
          return Promise.resolve(
            response({
              items: transactions,
              meta: {
                page: 1,
                pageSize: 20,
                total: transactions.length,
                totalPages: 1,
              },
            }),
          );
        if (
          input === `/api/v1/transactions/${transactionId}` &&
          init?.method === 'DELETE'
        ) {
          transactions = [];
          auditItems = [
            { ...entry, action: 'DELETE', before: entry.after, after: null },
          ];
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/audit-log');
    render(<App />);

    expect(
      await screen.findByText('В журнале пока нет изменений.'),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('link', { name: 'Вернуться на главную' }),
    );
    await user.click(screen.getByRole('link', { name: 'Транзакции' }));
    await screen.findByRole('table', { name: 'Транзакции' });
    await user.click(
      screen.getAllByRole('button', { name: 'Удалить транзакцию Обед' })[0],
    );
    await user.click(
      screen.getByRole('button', { name: 'Удалить окончательно' }),
    );
    expect(
      await screen.findByText('У вас пока нет транзакций.'),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('link', { name: 'Вернуться на главную' }),
    );
    await user.click(screen.getByRole('link', { name: 'Журнал изменений' }));

    expect(
      await screen.findByRole('table', { name: 'Журнал изменений' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Удаление' })).toBeInTheDocument();
  });

  it('restores filters, renders table and cards, and keeps filters when paging', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(response(profile));
      if (input.startsWith('/api/v1/audit-log?'))
        return Promise.resolve(response(list([entry], 2, 21)));
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(
      {},
      '',
      '/audit-log?entityType=TRANSACTION&page=2',
    );

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Журнал изменений' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('table', { name: 'Журнал изменений' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'Карточки изменений' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('entityType=TRANSACTION'),
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('page=2'),
      expect.objectContaining({ credentials: 'include' }),
    );
    await user.click(screen.getByRole('button', { name: 'Go to page 1' }));
    expect(new URLSearchParams(window.location.search).get('entityType')).toBe(
      'TRANSACTION',
    );
    expect(new URLSearchParams(window.location.search).has('page')).toBe(false);
    await user.click(screen.getByRole('combobox', { name: 'Действие' }));
    await user.click(screen.getByRole('option', { name: 'Создание' }));
    expect(new URLSearchParams(window.location.search).get('action')).toBe(
      'CREATE',
    );
  });

  it('presents mobile entries as an ordered chronology of cards', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(response(profile));
        if (input.startsWith('/api/v1/audit-log?'))
          return Promise.resolve(response(list([entry])));
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/audit-log');
    render(<App />);

    const chronology = await screen.findByRole('list', {
      name: 'Карточки изменений',
    });
    expect(chronology.tagName).toBe('OL');
    const card = within(chronology).getByRole('listitem');
    expect(within(card).getByText('Обед')).toBeInTheDocument();
    expect(within(card).getByText('Изменение')).toBeInTheDocument();
    expect(
      within(card).getByRole('button', { name: 'Подробнее об изменении' }),
    ).toBeInTheDocument();
    const machineTime = card.querySelector<HTMLElement>('time');
    expect(machineTime).toHaveAttribute('dateTime', entry.createdAt);
    expect(machineTime).toHaveTextContent('Europe/Moscow');
  });

  it('offers a way back when the requested page no longer exists', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(response(profile));
        if (input.startsWith('/api/v1/audit-log?')) {
          const page = new URL(input, 'http://localhost').searchParams.get(
            'page',
          );
          return Promise.resolve(
            response(page === '9' ? list([], 9, 21) : list([entry], 1, 21)),
          );
        }
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/audit-log?page=9');
    render(<App />);

    expect(
      await screen.findByText('На этой странице изменений больше нет.'),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Вернуться на первую страницу' }),
    );
    expect(new URLSearchParams(window.location.search).has('page')).toBe(false);
    expect(
      await screen.findByRole('table', { name: 'Журнал изменений' }),
    ).toBeInTheDocument();
  });

  it('shows readable before/after differences in the details dialog', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(response(profile));
        if (input.startsWith('/api/v1/audit-log?'))
          return Promise.resolve(response(list([entry])));
        if (input === `/api/v1/transactions/${transactionId}`)
          return Promise.resolve(
            response({ ...entry.after, id: transactionId }),
          );
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/audit-log');
    render(<App />);

    await screen.findByRole('table', { name: 'Журнал изменений' });
    await user.click(
      screen.getAllByRole('button', { name: 'Подробнее об изменении' })[0],
    );
    const dialog = screen.getByRole('dialog', { name: 'Детали изменения' });
    expect(within(dialog).getByText('Описание')).toBeInTheDocument();
    expect(within(dialog).getByText('Кофе')).toBeInTheDocument();
    expect(within(dialog).getByText('Обед')).toBeInTheDocument();
    expect(within(dialog).getByText('100.0000')).toBeInTheDocument();
    expect(within(dialog).getByText('125.0000')).toBeInTheDocument();
    expect(
      within(dialog).queryByText(/"description":/),
    ).not.toBeInTheDocument();
    expect(
      await within(dialog).findByRole('link', { name: 'Открыть транзакцию' }),
    ).toHaveAttribute('href', `/transactions?transactionId=${transactionId}`);
  });

  it('labels changed fields in the comparison without marking unchanged fields', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(response(profile));
        if (input.startsWith('/api/v1/audit-log?'))
          return Promise.resolve(response(list([entry])));
        if (input === `/api/v1/transactions/${transactionId}`)
          return Promise.resolve(
            response({ ...entry.after, id: transactionId }),
          );
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/audit-log');
    render(<App />);

    await screen.findByRole('table', { name: 'Журнал изменений' });
    await user.click(
      screen.getAllByRole('button', { name: 'Подробнее об изменении' })[0],
    );
    const comparison = within(
      screen.getByRole('dialog', { name: 'Детали изменения' }),
    ).getByRole('table', { name: 'Сравнение изменений' });
    expect(
      within(
        within(comparison).getByRole('row', { name: /Описание/ }),
      ).getByText('Изменено'),
    ).toBeInTheDocument();
    expect(
      within(
        within(comparison).getByRole('row', { name: /Валюта/ }),
      ).queryByText('Изменено'),
    ).not.toBeInTheDocument();
  });

  it('opens details with Enter, closes with Escape, and restores focus', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(response(profile));
        if (input.startsWith('/api/v1/audit-log?'))
          return Promise.resolve(response(list([entry])));
        if (input === `/api/v1/transactions/${transactionId}`)
          return Promise.resolve(
            response({ ...entry.after, id: transactionId }),
          );
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/audit-log');
    render(<App />);

    const openButton = (
      await screen.findAllByRole('button', { name: 'Подробнее об изменении' })
    )[0];
    openButton.focus();
    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog', { name: 'Детали изменения' });
    expect(document.activeElement?.closest('[role="dialog"]')).toBe(dialog);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(openButton).toHaveFocus();
  });

  it('does not link deleted transactions and remains usable after a 404', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(response(profile));
        if (input.startsWith('/api/v1/audit-log?'))
          return Promise.resolve(response(list([entry])));
        if (input === `/api/v1/transactions/${transactionId}`)
          return Promise.resolve(
            response(
              {
                statusCode: 404,
                code: 'TRANSACTION_NOT_FOUND',
                message: 'Not found',
                details: [],
              },
              404,
            ),
          );
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/audit-log');
    render(<App />);

    await screen.findByRole('table', { name: 'Журнал изменений' });
    await user.click(
      screen.getAllByRole('button', { name: 'Подробнее об изменении' })[0],
    );
    const dialog = screen.getByRole('dialog', { name: 'Детали изменения' });
    expect(
      await within(dialog).findByText('Транзакция больше не доступна.'),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('link', { name: 'Открыть транзакцию' }),
    ).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Закрыть' }));
    expect(
      screen.queryByRole('dialog', { name: 'Детали изменения' }),
    ).not.toBeInTheDocument();
  });

  it('shows loading, recoverable error, and empty filtered state', async () => {
    const user = userEvent.setup();
    let resolveList: ((value: Response) => void) | undefined;
    let attempts = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(response(profile));
        if (input.startsWith('/api/v1/audit-log?')) {
          attempts += 1;
          if (attempts === 1)
            return new Promise<Response>((resolve) => {
              resolveList = resolve;
            });
          return Promise.resolve(response(list([])));
        }
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/audit-log?action=DELETE');
    render(<App />);

    expect(
      await screen.findByRole('status', { name: 'Загрузка журнала' }),
    ).toBeInTheDocument();
    await act(async () => {
      resolveList?.(
        response(
          {
            statusCode: 503,
            code: 'SERVICE_UNAVAILABLE',
            message: 'Unavailable',
            details: [],
          },
          503,
        ),
      );
    });
    expect(
      await screen.findByText('Не удалось загрузить журнал изменений.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    await waitFor(() => expect(attempts).toBe(2));
    expect(
      await screen.findByText('По вашим фильтрам изменений не найдено.'),
    ).toBeInTheDocument();
  });
});
