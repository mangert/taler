import { createContext, useContext } from 'react';
import type {
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  UserProfile,
} from '../../shared/api/auth';

export const authQueryKey = ['auth', 'me'] as const;

export interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  login(input: LoginInput): Promise<UserProfile>;
  register(input: RegisterInput): Promise<UserProfile>;
  logout(): Promise<void>;
  updateProfile(input: UpdateProfileInput): Promise<UserProfile>;
  retry(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
