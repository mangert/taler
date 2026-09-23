import {
  Alert,
  Button,
  Container,
  Pagination,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../features/auth/auth-context';
import { CategoryGrid } from '../features/categories/CategoryGrid';
import { CategoryFormDialog } from '../features/categories/CategoryFormDialog';
import { DeleteCategoryDialog } from '../features/categories/DeleteCategoryDialog';
import { categoryKeys } from '../features/categories/category-keys';
import { invalidateCategoryDependents } from '../features/categories/invalidate-category-dependents';
import type { CategoryFormValues } from '../features/categories/category-schema';
import { categoriesApi } from '../shared/api/categories';
import type { Category } from '../shared/api/categories';

const pageSize = 20;

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function CategoriesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const page = parsePage(searchParams.get('page'));
  const userId = user?.id ?? '';
  const categoriesQuery = useQuery({
    queryKey: categoryKeys.list(userId, { search, page, pageSize }),
    queryFn: () => categoriesApi.list({ search, page, pageSize }),
    enabled: Boolean(userId),
  });
  const createCategory = useMutation({ mutationFn: categoriesApi.create });
  const updateCategory = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CategoryFormValues }) =>
      categoriesApi.update(id, values),
  });
  const deleteCategory = useMutation({ mutationFn: categoriesApi.remove });

  const saveCategory = async (values: CategoryFormValues): Promise<void> => {
    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, values });
    } else {
      await createCategory.mutateAsync(values);
    }
    await invalidateCategoryDependents(queryClient, userId);
    setFormOpen(false);
    setEditingCategory(null);
  };

  const openCreate = (): void => {
    setEditingCategory(null);
    setFormOpen(true);
  };

  const openEdit = (category: Category): void => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const confirmDelete = async (category: Category): Promise<void> => {
    await deleteCategory.mutateAsync(category.id);
    await invalidateCategoryDependents(queryClient, userId);
    setDeletingCategory(null);
  };

  const updateSearch = (value: string): void => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('search', value);
    else next.delete('search');
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const updatePage = (nextPage: number): void => {
    const next = new URLSearchParams(searchParams);
    if (nextPage === 1) next.delete('page');
    else next.set('page', String(nextPage));
    setSearchParams(next);
  };

  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, sm: 6 } }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between' }}
        >
          <div>
            <Typography component="h1" variant="h3" gutterBottom>
              Категории
            </Typography>
            <Typography color="text.secondary">
              Организуйте доходы и расходы по своим категориям.
            </Typography>
          </div>
          <Button variant="contained" onClick={openCreate}>
            Добавить категорию
          </Button>
        </Stack>
        <TextField
          label="Поиск категорий"
          value={search}
          onChange={(event) => updateSearch(event.target.value)}
          fullWidth
        />
        {categoriesQuery.isPending ? (
          <Stack role="status" aria-label="Загрузка категорий" spacing={2}>
            <Skeleton variant="rounded" height={120} />
            <Skeleton variant="rounded" height={120} />
            <Skeleton variant="rounded" height={120} />
          </Stack>
        ) : categoriesQuery.isError ? (
          <Alert
            severity="error"
            action={
              <Button onClick={() => void categoriesQuery.refetch()}>
                Повторить
              </Button>
            }
          >
            Не удалось загрузить категории.
          </Alert>
        ) : categoriesQuery.data.items.length === 0 ? (
          <Alert severity="info">
            {search
              ? 'По вашему запросу категории не найдены.'
              : 'У вас пока нет категорий.'}
          </Alert>
        ) : (
          <>
            <CategoryGrid
              categories={categoriesQuery.data.items}
              onEdit={openEdit}
              onDelete={setDeletingCategory}
            />
            {categoriesQuery.data.meta.totalPages > 1 ? (
              <Pagination
                aria-label="Страницы категорий"
                count={categoriesQuery.data.meta.totalPages}
                page={page}
                onChange={(_event, nextPage) => updatePage(nextPage)}
              />
            ) : null}
          </>
        )}
        <Button component={Link} to="/" sx={{ alignSelf: 'flex-start' }}>
          Вернуться на главную
        </Button>
        {formOpen ? (
          <CategoryFormDialog
            open
            category={editingCategory}
            onClose={() => setFormOpen(false)}
            onSave={saveCategory}
          />
        ) : null}
        {deletingCategory ? (
          <DeleteCategoryDialog
            category={deletingCategory}
            onClose={() => setDeletingCategory(null)}
            onConfirm={confirmDelete}
          />
        ) : null}
      </Stack>
    </Container>
  );
}
