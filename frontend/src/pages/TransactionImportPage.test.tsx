import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

describe('TransactionImportPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('opens a protected CSV import page with a file selection step', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(new Response(JSON.stringify(profile)));
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/transaction-imports');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Импорт транзакций' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('CSV-файл')).toBeInTheDocument();
  });

  it('announces the current named import step as the user progresses', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(new Response(JSON.stringify(profile)));
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/transaction-imports');
    render(<App />);

    const navigation = await screen.findByRole('navigation', {
      name: 'Этапы импорта',
    });
    const steps = within(navigation).getAllByRole('listitem');
    expect(steps).toHaveLength(4);
    expect(steps.map((step) => step.textContent)).toEqual([
      'Файл',
      'Сопоставление',
      'Предпросмотр',
      'Результат',
    ]);
    expect(steps[0]).toHaveAttribute('aria-current', 'step');

    await user.upload(
      screen.getByLabelText('CSV-файл'),
      new File(['Date,Amount\n2026-09-21,15.50\n'], 'expenses.csv', {
        type: 'text/csv',
      }),
    );
    await screen.findByRole('heading', { name: 'Сопоставление колонок' });
    expect(steps[1]).toHaveAttribute('aria-current', 'step');
    expect(steps[0]).not.toHaveAttribute('aria-current');
  });

  it('opens file selection by keyboard or button and accepts a dropped CSV', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(new Response(JSON.stringify(profile)));
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/transaction-imports');
    render(<App />);

    const fileInput = await screen.findByLabelText('CSV-файл');
    const pickerClick = vi
      .spyOn(fileInput, 'click')
      .mockImplementation(() => {});
    const dropZone = screen.getByRole('button', { name: 'Зона загрузки CSV' });
    dropZone.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    await user.click(screen.getByRole('button', { name: 'Выбрать файл' }));
    expect(pickerClick).toHaveBeenCalledTimes(3);

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [
          new File(['Date,Amount\n2026-09-21,15.50\n'], 'dropped.csv', {
            type: 'text/csv',
          }),
        ],
      },
    });
    expect(
      await screen.findByRole('heading', { name: 'Сопоставление колонок' }),
    ).toBeInTheDocument();
  });

  it('reads a CSV sample and suggests all supported column mappings', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(new Response(JSON.stringify(profile)));
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/transaction-imports');
    render(<App />);

    const file = new File(
      [
        'Date,Amount,Category,Type,Description,Currency,Rate\n',
        '2026-09-21,15.50,Продукты,EXPENSE,Обед,RUB,1\n',
      ],
      'expenses.csv',
      { type: 'text/csv' },
    );
    await user.upload(await screen.findByLabelText('CSV-файл'), file);

    expect(
      await screen.findByRole('heading', { name: 'Сопоставление колонок' }),
    ).toBeInTheDocument();
    const mappingForm = screen.getByRole('form', {
      name: 'Сопоставление колонок',
    });
    expect(within(mappingForm).getAllByRole('combobox')).toHaveLength(7);
    expect(within(mappingForm).queryByRole('table')).not.toBeInTheDocument();
    for (const [field, header] of [
      ['Дата', 'Date'],
      ['Сумма', 'Amount'],
      ['Категория', 'Category'],
      ['Тип', 'Type'],
      ['Описание', 'Description'],
      ['Валюта', 'Currency'],
      ['Курс', 'Rate'],
    ]) {
      expect(screen.getByRole('combobox', { name: field })).toHaveTextContent(
        header,
      );
    }
    await user.click(screen.getByRole('button', { name: 'Предпросмотр' }));
    expect(
      screen.getByRole('heading', { name: 'Предварительный просмотр' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Обед')).toBeInTheDocument();
    expect(
      screen.getByText(/не заменяет проверку сервером/i),
    ).toBeInTheDocument();
  });

  it('uploads the original CSV and mapping, then shows the imported count', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(new Response(JSON.stringify(profile)));
      if (input === '/api/v1/transaction-imports' && init?.method === 'POST')
        return Promise.resolve(
          new Response(JSON.stringify({ importedCount: 1 }), { status: 201 }),
        );
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/transaction-imports');
    render(<App />);

    const file = new File(
      ['Date,Amount,Category,Type\n2026-09-21,15.50,Продукты,EXPENSE\n'],
      'expenses.csv',
      { type: 'text/csv' },
    );
    await user.upload(await screen.findByLabelText('CSV-файл'), file);
    await screen.findByRole('heading', { name: 'Сопоставление колонок' });
    await user.click(screen.getByRole('button', { name: 'Предпросмотр' }));
    await user.click(screen.getByRole('button', { name: 'Импортировать' }));

    expect(
      await screen.findByText('Импортировано транзакций: 1'),
    ).toBeInTheDocument();
    const request = fetchMock.mock.calls.find(
      ([input]) => input === '/api/v1/transaction-imports',
    )?.[1];
    expect(request?.credentials).toBe('include');
    expect(request?.headers).not.toHaveProperty('Content-Type');
    expect(request?.body).toBeInstanceOf(FormData);
    const form = request?.body as FormData;
    expect(form.get('file')).toBe(file);
    expect(JSON.parse(String(form.get('mapping')))).toEqual({
      date: 'Date',
      amount: 'Amount',
      category: 'Category',
      type: 'Type',
    });
  });

  it('rejects a duplicate column mapping until the user chooses a unique column', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(new Response(JSON.stringify(profile)));
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/transaction-imports');
    render(<App />);

    await user.upload(
      await screen.findByLabelText('CSV-файл'),
      new File(
        ['Date,Amount,Category,Type\n2026-09-21,15.50,Продукты,EXPENSE\n'],
        'expenses.csv',
        { type: 'text/csv' },
      ),
    );
    await screen.findByRole('form', { name: 'Сопоставление колонок' });
    await user.click(screen.getByRole('combobox', { name: 'Сумма' }));
    await user.click(screen.getByRole('option', { name: 'Date' }));
    await user.click(screen.getByRole('button', { name: 'Предпросмотр' }));

    expect(screen.getByText('Колонка уже используется')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Предварительный просмотр' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Сумма' }));
    await user.click(screen.getByRole('option', { name: 'Amount' }));
    await user.click(screen.getByRole('button', { name: 'Предпросмотр' }));
    expect(
      screen.getByRole('heading', { name: 'Предварительный просмотр' }),
    ).toBeInTheDocument();
  });

  it('prevents duplicate imports while pending and shows the success result', async () => {
    const user = userEvent.setup();
    let finishImport: (response: Response) => void = () => {
      throw new Error('Import request did not start');
    };
    const pendingResponse = new Promise<Response>((resolve) => {
      finishImport = resolve;
    });
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/v1/auth/me')
        return Promise.resolve(new Response(JSON.stringify(profile)));
      if (input === '/api/v1/transaction-imports' && init?.method === 'POST')
        return pendingResponse;
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/transaction-imports');
    render(<App />);

    await user.upload(
      await screen.findByLabelText('CSV-файл'),
      new File(
        ['Date,Amount,Category,Type\n2026-09-21,15.50,Продукты,EXPENSE\n'],
        'expenses.csv',
        { type: 'text/csv' },
      ),
    );
    await screen.findByRole('heading', { name: 'Сопоставление колонок' });
    await user.click(screen.getByRole('button', { name: 'Предпросмотр' }));
    await user.click(screen.getByRole('button', { name: 'Импортировать' }));

    expect(screen.getByRole('button', { name: 'Импортируем…' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'К сопоставлению' }),
    ).toBeDisabled();
    expect(
      fetchMock.mock.calls.filter(
        ([input]) => input === '/api/v1/transaction-imports',
      ),
    ).toHaveLength(1);

    await act(async () => {
      finishImport(
        new Response(JSON.stringify({ importedCount: 1 }), { status: 201 }),
      );
    });
    expect(
      await screen.findByText('Импортировано транзакций: 1'),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('navigation', { name: 'Этапы импорта' }),
      ).getAllByRole('listitem')[3],
    ).toHaveAttribute('aria-current', 'step');
  });

  it('shows backend row errors and preserves mapping when returning to it', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string, init?: RequestInit) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(new Response(JSON.stringify(profile)));
        if (input === '/api/v1/transaction-imports' && init?.method === 'POST')
          return Promise.resolve(
            new Response(
              JSON.stringify({
                statusCode: 400,
                code: 'CSV_ROW_ERRORS',
                message: 'CSV contains invalid rows',
                details: [
                  {
                    row: 3,
                    field: 'amount',
                    code: 'INVALID_AMOUNT',
                    message: 'Amount must be positive',
                  },
                ],
              }),
              { status: 400 },
            ),
          );
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/transaction-imports');
    render(<App />);

    await user.upload(
      await screen.findByLabelText('CSV-файл'),
      new File(
        ['Date,Amount,Category,Type\n2026-09-21,15.50,Продукты,EXPENSE\n'],
        'expenses.csv',
        { type: 'text/csv' },
      ),
    );
    await screen.findByRole('heading', { name: 'Сопоставление колонок' });
    await user.click(screen.getByRole('button', { name: 'Предпросмотр' }));
    await user.click(screen.getByRole('button', { name: 'Импортировать' }));

    expect(
      await screen.findByText('Строка 3, поле amount: Amount must be positive'),
    ).toBeInTheDocument();
    const errorsHeading = screen.getByRole('heading', {
      name: 'Ошибки по строкам',
    });
    expect(
      within(
        screen.getByRole('list', { name: 'Ошибки по строкам' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'К началу ошибок' }));
    expect(errorsHeading).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'К сопоставлению' }));
    expect(screen.getByRole('combobox', { name: 'Дата' })).toHaveTextContent(
      'Date',
    );
    expect(screen.getByRole('combobox', { name: 'Сумма' })).toHaveTextContent(
      'Amount',
    );
  });

  it('requires missing mapping and lets the user choose a CSV column manually', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(new Response(JSON.stringify(profile)));
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/transaction-imports');
    render(<App />);

    await user.upload(
      await screen.findByLabelText('CSV-файл'),
      new File(
        ['When,Amount,Category,Type\n2026-09-21,15.50,Продукты,EXPENSE\n'],
        'expenses.csv',
        { type: 'text/csv' },
      ),
    );
    await screen.findByRole('heading', { name: 'Сопоставление колонок' });
    await user.click(screen.getByRole('button', { name: 'Предпросмотр' }));
    expect(await screen.findByText('Выберите колонку')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Дата' }));
    await user.click(screen.getByRole('option', { name: 'When' }));
    await user.click(screen.getByRole('button', { name: 'Предпросмотр' }));
    expect(
      screen.getByRole('heading', { name: 'Предварительный просмотр' }),
    ).toBeInTheDocument();
  });

  it('keeps the selected file and mapping when moving back to the first step', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(new Response(JSON.stringify(profile)));
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/transaction-imports');
    render(<App />);

    await user.upload(
      await screen.findByLabelText('CSV-файл'),
      new File(
        [
          'Date,When,Amount,Category,Type\n2026-09-21,2026-09-21,15.50,Продукты,EXPENSE\n',
        ],
        'expenses.csv',
        { type: 'text/csv' },
      ),
    );
    await screen.findByRole('heading', { name: 'Сопоставление колонок' });
    await user.click(screen.getByRole('combobox', { name: 'Дата' }));
    await user.click(screen.getByRole('option', { name: 'When' }));
    await user.click(screen.getByRole('button', { name: 'К выбору файла' }));
    expect(screen.getByText('Выбран файл: expenses.csv')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'К сопоставлению' }));
    expect(screen.getByRole('combobox', { name: 'Дата' })).toHaveTextContent(
      'When',
    );
  });

  it('does not reuse an old preview after a replacement file cannot be read', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/v1/auth/me')
          return Promise.resolve(new Response(JSON.stringify(profile)));
        throw new Error(`Unexpected request: ${input}`);
      }),
    );
    window.history.replaceState({}, '', '/transaction-imports');
    render(<App />);

    const fileInput = await screen.findByLabelText('CSV-файл');
    await user.upload(
      fileInput,
      new File(
        ['Date,Amount,Category,Type\n2026-09-21,15.50,Продукты,EXPENSE\n'],
        'valid.csv',
        { type: 'text/csv' },
      ),
    );
    await screen.findByRole('heading', { name: 'Сопоставление колонок' });
    await user.click(screen.getByRole('button', { name: 'К выбору файла' }));
    await user.upload(
      screen.getByLabelText('CSV-файл'),
      new File([], 'empty.csv', { type: 'text/csv' }),
    );

    expect(
      await screen.findByText('Не удалось прочитать заголовки CSV.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'К сопоставлению' }),
    ).not.toBeInTheDocument();
  });
});
