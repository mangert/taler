import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import DirectionsBusOutlinedIcon from '@mui/icons-material/DirectionsBusOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LaptopOutlinedIcon from '@mui/icons-material/LaptopOutlined';
import LocalGroceryStoreOutlinedIcon from '@mui/icons-material/LocalGroceryStoreOutlined';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import RedeemOutlinedIcon from '@mui/icons-material/RedeemOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import TheaterComedyOutlinedIcon from '@mui/icons-material/TheaterComedyOutlined';
import {
  Avatar,
  Card,
  CardActions,
  CardContent,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import type { Category } from '../../shared/api/categories';
import { pickCategoryIconColor } from './category-color';

interface CategoryCardProps {
  category: Category;
  onEdit(category: Category): void;
  onDelete(category: Category): void;
}

const categoryIcons = {
  category: CategoryOutlinedIcon,
  payments: PaymentsOutlinedIcon,
  laptop: LaptopOutlinedIcon,
  shopping_cart: ShoppingCartOutlinedIcon,
  directions_bus: DirectionsBusOutlinedIcon,
  home: HomeOutlinedIcon,
  medical_services: MedicalServicesOutlinedIcon,
  account_balance_wallet: AccountBalanceWalletOutlinedIcon,
  redeem: RedeemOutlinedIcon,
  local_grocery_store: LocalGroceryStoreOutlinedIcon,
  receipt_long: ReceiptLongOutlinedIcon,
  school: SchoolOutlinedIcon,
  theater_comedy: TheaterComedyOutlinedIcon,
};

export function CategoryCard({
  category,
  onEdit,
  onDelete,
}: CategoryCardProps) {
  const Icon =
    categoryIcons[category.icon as keyof typeof categoryIcons] ??
    CategoryOutlinedIcon;
  return (
    <Card component="article" variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Avatar
            role="img"
            aria-label={`Иконка категории ${category.name}`}
            sx={{
              bgcolor: category.color,
              color: pickCategoryIconColor(category.color),
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Icon />
          </Avatar>
          <div>
            <Typography component="h2" variant="h6">
              {category.name}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {category.type === 'INCOME' ? 'Доход' : 'Расход'}
            </Typography>
          </div>
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <IconButton
          aria-label={`Изменить категорию ${category.name}`}
          onClick={() => onEdit(category)}
        >
          <EditOutlinedIcon />
        </IconButton>
        <IconButton
          aria-label={`Удалить категорию ${category.name}`}
          onClick={() => onDelete(category)}
        >
          <DeleteOutlinedIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
}
