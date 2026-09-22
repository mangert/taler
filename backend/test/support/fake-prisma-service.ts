interface FakeUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  baseCurrency: string;
  timeZone: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FindUniqueUserArguments {
  where: {
    id?: string;
    email?: string;
  };
}

interface CreateUserArguments {
  data: {
    email: string;
    passwordHash: string;
    displayName: string;
    baseCurrency: string;
    timeZone: string;
  };
}

interface UpdateUserArguments {
  where: {
    id: string;
  };
  data: Partial<Pick<FakeUser, 'displayName' | 'baseCurrency' | 'timeZone'>>;
}

interface CountTransactionArguments {
  where: {
    userId: string;
  };
}

export class FakePrismaService {
  private readonly users: FakeUser[] = [];
  private readonly transactionUserIds: string[] = [];

  readonly user = {
    findUnique: async (
      arguments_: FindUniqueUserArguments,
    ): Promise<FakeUser | null> =>
      this.users.find(
        (user) =>
          user.id === arguments_.where.id ||
          user.email === arguments_.where.email,
      ) ?? null,
    create: async (arguments_: CreateUserArguments): Promise<FakeUser> => {
      const timestamp = new Date('2026-09-21T10:00:00.000Z');
      const user = {
        id: `70000000-0000-4000-8000-${String(this.users.length + 1).padStart(12, '0')}`,
        ...arguments_.data,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      this.users.push(user);

      return { ...user };
    },
    update: async (arguments_: UpdateUserArguments): Promise<FakeUser> => {
      const user = this.users.find(
        (candidate) => candidate.id === arguments_.where.id,
      );

      if (!user) {
        throw new Error('Fake user not found');
      }

      Object.assign(user, arguments_.data, {
        updatedAt: new Date('2026-09-21T10:01:00.000Z'),
      });

      return { ...user };
    },
  };

  readonly transaction = {
    count: async (arguments_: CountTransactionArguments): Promise<number> =>
      this.transactionUserIds.filter(
        (userId) => userId === arguments_.where.userId,
      ).length,
  };

  addTransaction(userId: string): void {
    this.transactionUserIds.push(userId);
  }

  getUsers(): FakeUser[] {
    return this.users.map((user) => ({ ...user }));
  }
}
