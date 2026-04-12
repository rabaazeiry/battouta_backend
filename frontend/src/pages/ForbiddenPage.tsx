import { FiLock } from 'react-icons/fi';
import { Link } from '@tanstack/react-router';

export function ForbiddenPage() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 grid place-items-center mx-auto">
          <FiLock size={24} />
        </div>
        <h1 className="text-2xl font-semibold mt-4">403 — Forbidden</h1>
        <p className="text-slate-500 mt-1">You don't have permission to view this page.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex">Back to dashboard</Link>
      </div>
    </div>
  );
}
