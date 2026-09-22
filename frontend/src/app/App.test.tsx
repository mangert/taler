import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('App', () => {
  const userProfile = {
    id: '10000000-0000-4000-8000-000000000001',
    email: 'personal@taler.local',
    displayName: 'Личный',
    baseCurrency: 'RUB',
    timeZone: 'Europe/Moscow',
    createdAt: '2026-09-21T10:00:00.000Z',
    updatedAt: '2026-09-21T10:00:00.000Z',
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('shows login and registration routes when there is no session', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 401,
          code: 'INVALID_SESSION',
          message: 'Authentication is required',
          details: [],
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/profile');
    render(<App />);

    expect(
      await screen.findByRole('region', { name: 'Авторизация' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Вход в Taler' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    const password = screen.getByLabelText('Пароль');
    expect(password).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Показать пароль' }));

    expect(password).toHaveAttribute('type', 'text');
    expect(
      screen.getByRole('button', { name: 'Скрыть пароль' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/me',
      expect.objectContaining({ credentials: 'include' }),
    );

    await user.click(screen.getByRole('link', { name: 'Создать аккаунт' }));

    expect(
      await screen.findByRole('heading', { name: 'Регистрация' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Имя')).toBeInTheDocument();
    expect(screen.getByLabelText('Основная валюта')).toBeInTheDocument();
    expect(screen.getByLabelText('Часовой пояс')).toBeInTheDocument();
  });

  it('keeps protected content hidden while checking an expired session', async () => {
    let resolveRequest: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/profile');
    render(<App />);

    expect(screen.getByText('Проверяем сессию…')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Профиль' })).toBeNull();

    await act(async () => {
      resolveRequest?.(
        new Response(
          JSON.stringify({
            statusCode: 401,
            code: 'INVALID_SESSION',
            message: 'Authentication is required',
            details: [],
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );
    });

    expect(
      await screen.findByRole('heading', { name: 'Вход в Taler' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Профиль' })).toBeNull();
  });

  it('updates the authenticated user profile', async () => {
    const user = userEvent.setup();
    const updatedProfile = {
      ...userProfile,
      displayName: 'Обновлённое имя',
      baseCurrency: 'EUR',
      timeZone: 'Europe/Amsterdam',
      updatedAt: '2026-09-21T11:00:00.000Z',
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(userProfile), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(updatedProfile), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/profile');
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Профиль' }),
    ).toBeInTheDocument();
    const displayName = screen.getByLabelText('Имя');
    const baseCurrency = screen.getByLabelText('Основная валюта');
    const timeZone = screen.getByLabelText('Часовой пояс');

    expect(screen.getByLabelText('Email')).toHaveValue(userProfile.email);
    expect(displayName).toHaveValue(userProfile.displayName);

    await user.clear(displayName);
    await user.type(displayName, updatedProfile.displayName);
    await user.clear(baseCurrency);
    await user.type(baseCurrency, updatedProfile.baseCurrency);
    await user.clear(timeZone);
    await user.type(timeZone, updatedProfile.timeZone);
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Профиль сохранён')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/v1/users/me',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          displayName: updatedProfile.displayName,
          baseCurrency: updatedProfile.baseCurrency,
          timeZone: updatedProfile.timeZone,
        }),
      }),
    );
  });

  it('validates registration locally and binds a duplicate email error to the field', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            statusCode: 401,
            code: 'INVALID_SESSION',
            message: 'Authentication is required',
            details: [],
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            statusCode: 409,
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'An account with this email already exists',
            details: [],
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/register');
    render(<App />);

    const email = await screen.findByLabelText('Email');

    await user.type(email, 'invalid-email');
    await user.click(screen.getByRole('button', { name: 'Создать аккаунт' }));

    expect(
      await screen.findByText('Введите корректный email'),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.clear(email);
    await user.type(email, 'duplicate@example.test');
    await user.type(screen.getByLabelText('Пароль'), 'Strong-password-1!');
    await user.type(screen.getByLabelText('Имя'), 'Duplicate User');
    await user.click(screen.getByRole('button', { name: 'Создать аккаунт' }));

    expect(email).toHaveAccessibleDescription(
      'An account with this email already exists',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('binds backend validation details to the corresponding login field', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            statusCode: 401,
            code: 'INVALID_SESSION',
            message: 'Authentication is required',
            details: [],
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            statusCode: 400,
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: ['password must not contain whitespace'],
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/login');
    render(<App />);

    const password = await screen.findByLabelText('Пароль');
    await user.type(screen.getByLabelText('Email'), 'user@example.test');
    await user.type(password, 'backend-validates-this');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(password).toHaveAccessibleDescription(
      'password must not contain whitespace',
    );
  });

  it('announces and focuses a general authentication error', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            statusCode: 401,
            code: 'INVALID_SESSION',
            message: 'Authentication is required',
            details: [],
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            statusCode: 401,
            code: 'INVALID_CREDENTIALS',
            message: 'Неверный email или пароль',
            details: [],
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/login');
    render(<App />);

    await user.type(await screen.findByLabelText('Email'), 'user@example.test');
    await user.type(screen.getByLabelText('Пароль'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Неверный email или пароль');
    expect(alert).toHaveFocus();
  });

  it('focuses the first invalid field and blocks duplicate login submissions', async () => {
    const user = userEvent.setup();
    let resolveLogin: ((response: Response) => void) | undefined;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            statusCode: 401,
            code: 'INVALID_SESSION',
            message: 'Authentication is required',
            details: [],
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveLogin = resolve;
          }),
      );

    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/login');
    render(<App />);

    const email = await screen.findByLabelText('Email');
    const submitButton = screen.getByRole('button', { name: 'Войти' });

    await user.click(submitButton);

    expect(email).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.type(email, 'user@example.test');
    await user.type(screen.getByLabelText('Пароль'), 'valid-password');
    await user.click(submitButton);

    const pendingButton = screen.getByRole('button', { name: 'Входим…' });
    expect(pendingButton).toBeDisabled();

    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveLogin?.(
        new Response(
          JSON.stringify({
            statusCode: 401,
            code: 'INVALID_CREDENTIALS',
            message: 'Неверный email или пароль',
            details: [],
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Неверный email или пароль',
    );
  });

  it('returns to the requested protected route after a successful login', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            statusCode: 401,
            code: 'INVALID_SESSION',
            message: 'Authentication is required',
            details: [],
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(userProfile), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/profile');
    render(<App />);

    await user.type(
      await screen.findByLabelText('Email'),
      'personal@taler.local',
    );
    await user.type(screen.getByLabelText('Пароль'), 'Strong-password-1!');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(
      await screen.findByRole('heading', { name: 'Профиль' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/profile');
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
  });
});
