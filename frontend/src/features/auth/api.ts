import { api } from '@/lib/api/client';
import type { AuthUser } from '@/stores/auth.store';

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};
export type AuthResponse = { success: boolean; token: string; user: AuthUser; message?: string };

export async function login(payload: LoginPayload) {
  const { data } = await api.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function register(payload: RegisterPayload) {
  const { data } = await api.post<AuthResponse>('/auth/register', payload);
  return data;
}

export async function me() {
  const { data } = await api.get<{ success: boolean; data: AuthUser }>('/auth/me');
  return data.data;
}
