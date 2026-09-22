export type TestFixtureKey = 'first' | 'second';
export type TestTransactionType = 'INCOME' | 'EXPENSE';

export interface TestUserFixture {
  id: string;
  email: string;
  password: string;
  displayName: string;
  baseCurrency: string;
  timeZone: string;
}

export interface TestCategoryFixture {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  type: TestTransactionType;
}

export interface TestTransactionFixture {
  id: string;
  userId: string;
  categoryId: string;
  type: TestTransactionType;
  amount: string;
  currency: string;
  exchangeRateToBase: string;
  baseAmount: string;
  transactionDate: Date;
  description: string;
}

export interface TestUserDataFixture {
  user: TestUserFixture;
  category: TestCategoryFixture;
  transaction: TestTransactionFixture;
}

const fixtureSeeds = {
  first: {
    userId: '11111111-1111-4111-8111-111111111111',
    categoryId: '11111111-1111-4111-8111-111111111112',
    transactionId: '11111111-1111-4111-8111-111111111113',
    email: 'first.user@example.test',
    displayName: 'First Test User',
    categoryName: 'First groceries',
  },
  second: {
    userId: '22222222-2222-4222-8222-222222222221',
    categoryId: '22222222-2222-4222-8222-222222222222',
    transactionId: '22222222-2222-4222-8222-222222222223',
    email: 'second.user@example.test',
    displayName: 'Second Test User',
    categoryName: 'Second groceries',
  },
} as const;

export function createTestUser(
  key: TestFixtureKey,
  overrides: Partial<TestUserFixture> = {},
): TestUserFixture {
  const seed = fixtureSeeds[key];

  return {
    id: seed.userId,
    email: seed.email,
    password: 'Test-password-1!',
    displayName: seed.displayName,
    baseCurrency: 'EUR',
    timeZone: 'Europe/Amsterdam',
    ...overrides,
  };
}

export function createTestCategory(
  user: TestUserFixture,
  key: TestFixtureKey,
  overrides: Partial<TestCategoryFixture> = {},
): TestCategoryFixture {
  const seed = fixtureSeeds[key];

  return {
    id: seed.categoryId,
    userId: user.id,
    name: seed.categoryName,
    icon: 'shopping-cart',
    color: '#2E7D32',
    type: 'EXPENSE',
    ...overrides,
  };
}

export function createTestTransaction(
  user: TestUserFixture,
  category: TestCategoryFixture,
  key: TestFixtureKey,
  overrides: Partial<TestTransactionFixture> = {},
): TestTransactionFixture {
  const seed = fixtureSeeds[key];

  return {
    id: seed.transactionId,
    userId: user.id,
    categoryId: category.id,
    type: 'EXPENSE',
    amount: '125.50',
    currency: user.baseCurrency,
    exchangeRateToBase: '1.00000000',
    baseAmount: '125.50',
    transactionDate: new Date('2026-09-01T00:00:00.000Z'),
    description: `${user.displayName} groceries`,
    ...overrides,
  };
}

export function createTestUserData(key: TestFixtureKey): TestUserDataFixture {
  const user = createTestUser(key);
  const category = createTestCategory(user, key);
  const transaction = createTestTransaction(user, category, key);

  return { user, category, transaction };
}

export function createTwoUserFixtures(): [
  TestUserDataFixture,
  TestUserDataFixture,
] {
  return [createTestUserData('first'), createTestUserData('second')];
}
