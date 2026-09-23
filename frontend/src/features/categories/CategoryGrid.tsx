import { Box } from '@mui/material';
import type { Category } from '../../shared/api/categories';
import { CategoryCard } from './CategoryCard';

interface CategoryGridProps {
  categories: Category[];
  onEdit(category: Category): void;
  onDelete(category: Category): void;
}

export function CategoryGrid({
  categories,
  onEdit,
  onDelete,
}: CategoryGridProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          sm: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(3, minmax(0, 1fr))',
        },
      }}
    >
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </Box>
  );
}
