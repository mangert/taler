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

const groceries = {
  id: '20000000-0000-4000-8000-000000000003',
  name: 'Продукты',
  icon: 'shopping_cart',
  color: '#EF6C00',
  type: 'EXPENSE',
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('CategoriesPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('shows the authenticated user category cards', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories')) {
        return Promise.resolve(
          jsonResponse({
            items: [groceries],
            meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          }),
        );
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/categories');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Категории' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Продукты')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Добавить категорию' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/categories'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('validates and creates a category, then shows it in the list', async () => {
    const user = userEvent.setup();
    const created = {
      ...groceries,
      id: '20000000-0000-4000-8000-000000000004',
      name: 'Транспорт',
    };
    const categories = [groceries];
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?')) {
        return Promise.resolve(
          jsonResponse({
            items: [...categories],
            meta: {
              page: 1,
              pageSize: 20,
              total: categories.length,
              totalPages: 1,
            },
          }),
        );
      }
      if (input === '/api/v1/categories' && init?.method === 'POST') {
        categories.push(created);
        return Promise.resolve(jsonResponse(created, 201));
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/categories');
    render(<App />);

    await screen.findByText('Продукты');
    await user.click(
      screen.getByRole('button', { name: 'Добавить категорию' }),
    );

    expect(
      screen.getByRole('dialog', { name: 'Новая категория' }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Сохранить категорию' }),
    );
    expect(
      await screen.findByText('Введите название категории'),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await user.type(screen.getByLabelText('Название'), 'Транспорт');
    await user.click(
      screen.getByRole('button', { name: 'Сохранить категорию' }),
    );

    expect(await screen.findByText('Транспорт')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/categories',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Транспорт',
          icon: 'category',
          color: '#2E7D32',
          type: 'EXPENSE',
        }),
      }),
    );
  });

  it('edits the name, icon and color of an existing category', async () => {
    const user = userEvent.setup();
    let current = groceries;
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?')) {
        return Promise.resolve(
          jsonResponse({
            items: [current],
            meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          }),
        );
      }
      if (
        input === `/api/v1/categories/${groceries.id}` &&
        init?.method === 'PATCH'
      ) {
        current = {
          ...current,
          name: 'Поездки',
          icon: 'directions_bus',
          color: '#123456',
        };
        return Promise.resolve(jsonResponse(current));
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/categories');
    render(<App />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Изменить категорию Продукты',
      }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Изменить категорию' }),
    ).toBeInTheDocument();
    const name = screen.getByLabelText('Название');
    expect(name).toHaveValue('Продукты');
    await user.clear(name);
    await user.type(name, 'Поездки');
    await user.click(screen.getByRole('combobox', { name: 'Иконка' }));
    await user.click(screen.getByRole('option', { name: 'Автобус' }));
    fireEvent.change(screen.getByLabelText('Цвет'), {
      target: { value: '#123456' },
    });
    await user.click(
      screen.getByRole('button', { name: 'Сохранить категорию' }),
    );

    expect(await screen.findByText('Поездки')).toBeInTheDocument();
    expect(screen.getByTestId('DirectionsBusOutlinedIcon')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/categories/${groceries.id}`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Поездки',
          icon: 'directions_bus',
          color: '#123456',
          type: 'EXPENSE',
        }),
      }),
    );
  });

  it('asks for confirmation and removes a category only after approval', async () => {
    const user = userEvent.setup();
    let categories = [groceries];
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?')) {
        return Promise.resolve(
          jsonResponse({
            items: categories,
            meta: {
              page: 1,
              pageSize: 20,
              total: categories.length,
              totalPages: 1,
            },
          }),
        );
      }
      if (
        input === `/api/v1/categories/${groceries.id}` &&
        init?.method === 'DELETE'
      ) {
        categories = [];
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/categories');
    render(<App />);

    await user.click(
      await screen.findByRole('button', { name: 'Удалить категорию Продукты' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Удалить категорию' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Удалить категорию' }),
      ).not.toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalledWith(
      `/api/v1/categories/${groceries.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Удалить категорию Продукты' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Удалить окончательно' }),
    );

    expect(
      await screen.findByText('У вас пока нет категорий.'),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/categories/${groceries.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('keeps the confirmation open when the category is in use', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?')) {
        return Promise.resolve(
          jsonResponse({
            items: [groceries],
            meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          }),
        );
      }
      if (
        input === `/api/v1/categories/${groceries.id}` &&
        init?.method === 'DELETE'
      ) {
        return Promise.resolve(
          jsonResponse(
            {
              statusCode: 409,
              code: 'CATEGORY_IN_USE',
              message: 'Category is in use',
              details: [],
            },
            409,
          ),
        );
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/categories');
    render(<App />);

    await user.click(
      await screen.findByRole('button', { name: 'Удалить категорию Продукты' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Удалить окончательно' }),
    );

    expect(
      await screen.findByText(
        'Категория используется в операциях, бюджетах или регулярных платежах.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: 'Удалить категорию' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Продукты')).toBeInTheDocument();
  });

  it('shows loading, then a recoverable error and the loaded categories', async () => {
    const user = userEvent.setup();
    let fail = true;
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?')) {
        if (fail) return Promise.reject(new Error('Network unavailable'));
        return Promise.resolve(
          jsonResponse({
            items: [groceries],
            meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          }),
        );
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/categories');
    render(<App />);

    expect(
      await screen.findByRole('status', { name: 'Загрузка категорий' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Не удалось загрузить категории.'),
    ).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByText('Продукты')).toBeInTheDocument();
  });

  it('shows distinct empty states before and after searching', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?')) {
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
    window.history.replaceState({}, '', '/categories');
    render(<App />);

    expect(
      await screen.findByText('У вас пока нет категорий.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Добавить категорию' }),
    ).toBeEnabled();

    await user.type(
      screen.getByRole('textbox', { name: 'Поиск категорий' }),
      'Несуществующая',
    );
    expect(
      await screen.findByText('По вашему запросу категории не найдены.'),
    ).toBeInTheDocument();
  });

  it('searches categories and resets pagination when the search changes', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(jsonResponse(profile));
      if (input.startsWith('/api/v1/categories?')) {
        const query = new URL(input, 'http://localhost').searchParams;
        if (query.get('search') === 'Зарплата') {
          return Promise.resolve(
            jsonResponse({
              items: [{ ...groceries, name: 'Зарплата', type: 'INCOME' }],
              meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
            }),
          );
        }
        return Promise.resolve(
          jsonResponse({
            items: [groceries],
            meta: { page: 2, pageSize: 20, total: 21, totalPages: 2 },
          }),
        );
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/categories?page=2');
    render(<App />);

    await screen.findByText('Продукты');
    await user.type(
      screen.getByRole('textbox', { name: 'Поиск категорий' }),
      'Зарплата',
    );

    expect(await screen.findByText('Зарплата')).toBeInTheDocument();
    expect(window.location.search).toContain('search=');
    expect(window.location.search).not.toContain('page=');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('search=%D0%97%D0%B0%D1%80%D0%BF%D0%BB%D0%B0'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});
