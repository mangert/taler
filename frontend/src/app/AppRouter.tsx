import { Box } from '@mui/material';
import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthLayout } from '../features/auth/AuthLayout';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { LoadingState } from '../shared/ui/PageStates';
import { ErrorBoundary } from './ErrorBoundary';
import { ProtectedLayout } from './ProtectedLayout';

const AuditLogPage = lazy(() =>
  import('../pages/AuditLogPage').then(({ AuditLogPage }) => ({
    default: AuditLogPage,
  })),
);
const BudgetsPage = lazy(() =>
  import('../pages/BudgetsPage').then(({ BudgetsPage }) => ({
    default: BudgetsPage,
  })),
);
const CategoriesPage = lazy(() =>
  import('../pages/CategoriesPage').then(({ CategoriesPage }) => ({
    default: CategoriesPage,
  })),
);
const HomePage = lazy(() =>
  import('../pages/HomePage').then(({ HomePage }) => ({ default: HomePage })),
);
const LoginPage = lazy(() =>
  import('../pages/LoginPage').then(({ LoginPage }) => ({
    default: LoginPage,
  })),
);
const ProfilePage = lazy(() =>
  import('../pages/ProfilePage').then(({ ProfilePage }) => ({
    default: ProfilePage,
  })),
);
const RecurringTransactionsPage = lazy(() =>
  import('../pages/RecurringTransactionsPage').then(
    ({ RecurringTransactionsPage }) => ({
      default: RecurringTransactionsPage,
    }),
  ),
);
const RegisterPage = lazy(() =>
  import('../pages/RegisterPage').then(({ RegisterPage }) => ({
    default: RegisterPage,
  })),
);
const TransactionImportPage = lazy(() =>
  import('../pages/TransactionImportPage').then(
    ({ TransactionImportPage }) => ({
      default: TransactionImportPage,
    }),
  ),
);
const TransactionsPage = lazy(() =>
  import('../pages/TransactionsPage').then(({ TransactionsPage }) => ({
    default: TransactionsPage,
  })),
);

function RouteBoundary() {
  const location = useLocation();

  return (
    <ErrorBoundary key={location.pathname}>
      <Suspense
        fallback={
          <Box sx={{ p: 4 }}>
            <LoadingState message="Загрузка страницы…" />
          </Box>
        }
      >
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route element={<RouteBoundary />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<ProtectedLayout />}>
          <Route element={<RouteBoundary />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route
              path="/transaction-imports"
              element={<TransactionImportPage />}
            />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route
              path="/recurring-transactions"
              element={<RecurringTransactionsPage />}
            />
            <Route path="/audit-log" element={<AuditLogPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
