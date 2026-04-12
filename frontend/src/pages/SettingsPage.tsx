import { useAuthStore } from '@/stores/auth.store';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      <div className="card space-y-3">
        <h3 className="font-semibold">Profile</h3>
        <div className="text-sm text-slate-600"><strong>Name:</strong> {user?.firstName} {user?.lastName}</div>
        <div className="text-sm text-slate-600"><strong>Email:</strong> {user?.email}</div>
        <div className="text-sm text-slate-600"><strong>Role:</strong> <span className={user?.role === 'admin' ? 'badge-admin' : 'badge-user'}>{user?.role}</span></div>
      </div>
    </div>
  );
}
