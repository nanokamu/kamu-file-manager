import { apiRequest } from '../../../api/client';
import type { AuthResponse, LoginRequest, User } from '../types/auth.types';

export function login(body: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function getMe(): Promise<User> {
  return apiRequest<User>('users/me');
}
