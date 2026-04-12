import { api } from '@/lib/api/client';
import type { AuthUser } from '@/stores/auth.store';

export type AdminUser = AuthUser & { isActive: boolean; createdAt?: string; lastLogin?: string };

export async function listUsers(params?: { q?: string; role?: string }) {
  const { data } = await api.get<{ success: boolean; data: AdminUser[] }>('/admin/users', { params });
  return data.data ?? [];
}

export async function updateUserRole(id: string, role: 'user' | 'admin') {
  const { data } = await api.patch<{ success: boolean; data: AdminUser }>(`/admin/users/${id}/role`, { role });
  return data.data;
}

export async function toggleActive(id: string) {
  const { data } = await api.patch<{ success: boolean; data: AdminUser }>(`/admin/users/${id}/toggle-active`);
  return data.data;
}

export async function deleteUser(id: string) {
  const { data } = await api.delete(`/admin/users/${id}`);
  return data;
}

export async function getStats() {
  const { data } = await api.get<{ success: boolean; data: { totalUsers: number; activeUsers: number; admins: number; totalProjects: number } }>('/admin/stats');
  return data.data;
}
