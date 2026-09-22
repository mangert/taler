import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth } from './auth-context';
import { AuthProvider } from './AuthProvider';

function LogoutProbe() {
  const { logout, user } = useAuth();

  return (
    <div>
      <span>{user?.email ?? 'Нет сессии'}</span>
      <button type="button" onClick={() => void logout()}>
        Выйти
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('clears private query data on logout without storing the session in localStorage', async () => {
    const user = userEvent.setup();
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const profile = {
      id: '10000000-0000-4000-8000-000000000001',
      email: 'personal@taler.local',
      displayName: 'Личный',
      baseCurrency: 'RUB',
      timeZone: 'Europe/Moscow',
      createdAt: '2026-09-21T10:00:00.000Z',
      updatedAt: '2026-09-21T10:00:00.000Z',
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(profile), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(['private', 'transactions'], [{ id: 'secret' }]);

    vi.stubGlobal('fetch', fetchMock);
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LogoutProbe />
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(profile.email)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Выйти' }));

    await waitFor(() => {
      expect(
        queryClient.getQueryData(['private', 'transactions']),
      ).toBeUndefined();
    });
    expect(await screen.findByText('Нет сессии')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/v1/auth/logout',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(storageSpy).not.toHaveBeenCalled();
    expect(window.localStorage).toHaveLength(0);
  });
});
