import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiShield, FiToggleLeft, FiToggleRight, FiTrash2 } from 'react-icons/fi';
import { listUsers, updateUserRole, toggleActive, deleteUser, getStats } from '@/features/admin/api';

export function AdminPage() {
  const qc = useQueryClient();
  const { data: users } = useQuery({ queryKey: ['admin', 'users'], queryFn: () => listUsers() });
  const { data: stats } = useQuery({ queryKey: ['admin', 'stats'], queryFn: getStats });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'user' | 'admin' }) => updateUserRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] })
  });
  const toggleMut = useMutation({
    mutationFn: (id: string) => toggleActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] })
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] })
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FiShield className="text-brand-600" size={22} />
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin panel</h1>
          <p className="text-slate-500">Manage users, roles, and system health.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card"><div className="text-xs text-slate-500">Total users</div><div className="text-2xl font-semibold">{stats?.totalUsers ?? '—'}</div></div>
        <div className="card"><div className="text-xs text-slate-500">Active</div><div className="text-2xl font-semibold">{stats?.activeUsers ?? '—'}</div></div>
        <div className="card"><div className="text-xs text-slate-500">Admins</div><div className="text-2xl font-semibold">{stats?.admins ?? '—'}</div></div>
        <div className="card"><div className="text-xs text-slate-500">Projects</div><div className="text-2xl font-semibold">{stats?.totalProjects ?? '—'}</div></div>
      </div>

      <div className="card overflow-x-auto">
        <h3 className="font-semibold mb-4">Users</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b">
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="py-3 font-medium">{u.firstName} {u.lastName}</td>
                <td className="text-slate-600">{u.email}</td>
                <td>
                  <select
                    className="input max-w-[8rem]"
                    value={u.role}
                    onChange={(e) => roleMut.mutate({ id: u.id, role: e.target.value as 'user' | 'admin' })}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>
                  <span className={u.isActive ? 'badge bg-emerald-100 text-emerald-800' : 'badge bg-slate-100 text-slate-600'}>
                    {u.isActive ? 'active' : 'disabled'}
                  </span>
                </td>
                <td className="text-right space-x-2">
                  <button
                    title={u.isActive ? 'Disable' : 'Enable'}
                    className="btn-ghost px-2"
                    onClick={() => toggleMut.mutate(u.id)}
                  >
                    {u.isActive ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
                  </button>
                  <button
                    title="Delete"
                    className="btn-danger px-2 py-1"
                    onClick={() => {
                      if (confirm(`Delete ${u.email}?`)) deleteMut.mutate(u.id);
                    }}
                  >
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
