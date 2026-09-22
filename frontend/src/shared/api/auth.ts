import type { components } from './schema';
import { apiRequest } from './http';

export type UserProfile = components['schemas']['UserResponseDto'];
export type LoginInput = components['schemas']['LoginDto'];
export type RegisterInput = components['schemas']['RegisterDto'];
export type UpdateProfileInput = components['schemas']['UpdateProfileDto'];

export const authApi = {
  getCurrentUser: (): Promise<UserProfile> =>
    apiRequest<UserProfile>('/api/v1/auth/me'),
  login: (input: LoginInput): Promise<UserProfile> =>
    apiRequest<UserProfile>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  register: (input: RegisterInput): Promise<UserProfile> =>
    apiRequest<UserProfile>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  logout: (): Promise<void> =>
    apiRequest<void>('/api/v1/auth/logout', { method: 'POST' }),
  updateProfile: (input: UpdateProfileInput): Promise<UserProfile> =>
    apiRequest<UserProfile>('/api/v1/users/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
};
