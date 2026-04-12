import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiPlus, FiZap } from 'react-icons/fi';
import { listProjects, triggerWsDemo } from '@/features/projects/api';
import { useSocket } from '@/hooks/useSocket';
import { WS_EVENTS, type ScrapingProgress } from '@/lib/ws/events';

export function ProjectsPage() {
  const { data: projects, isLoading } = useQuery({ queryKey: ['projects'], queryFn: listProjects });
  const [demoProjectId, setDemoProjectId] = useState<string>('demo');
  const [progress, setProgress] = useState<{ pct: number; message: string } | null>(null);
  const { on } = useSocket(demoProjectId);

  useEffect(() => {
    const off1 = on(WS_EVENTS.SCRAPING_STARTED, () => setProgress({ pct: 0, message: 'Starting…' }));
    const off2 = on(WS_EVENTS.SCRAPING_PROGRESS, (p: ScrapingProgress) =>
      setProgress({ pct: p.pct, message: p.message ?? p.step })
    );
    const off3 = on(WS_EVENTS.SCRAPING_COMPLETE, () => {
      setProgress({ pct: 100, message: 'Done' });
      setTimeout(() => setProgress(null), 1500);
    });
    return () => {
      off1(); off2(); off3();
    };
  }, [demoProjectId, on]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
          <p className="text-slate-500">Business ideas you're tracking.</p>
        </div>
        <button className="btn-primary">
          <FiPlus /> New project
        </button>
      </div>

      {/* Live WS demo card */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <FiZap className="text-amber-500" /> Live progress demo
            </h3>
            <p className="text-xs text-slate-500">Emits fake scraping events via Socket.IO — proves the WS pipeline works end-to-end.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              className="input max-w-[12rem]"
              value={demoProjectId}
              onChange={(e) => setDemoProjectId(e.target.value)}
              placeholder="projectId"
            />
            <button
              className="btn-primary"
              onClick={() => triggerWsDemo(demoProjectId, 6)}
            >
              Trigger
            </button>
          </div>
        </div>
        {progress ? (
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{progress.message}</span>
              <span>{progress.pct}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 transition-all duration-300"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400">No active job — click Trigger to stream events.</div>
        )}
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : !projects || projects.length === 0 ? (
          <div className="text-sm text-slate-500">No projects yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b">
                <th className="py-2">Business idea</th>
                <th>Category</th>
                <th>Status</th>
                <th>Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p._id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="py-3 font-medium text-slate-800">{p.businessIdea}</td>
                  <td className="text-slate-600">{p.marketCategory ?? '—'}</td>
                  <td className="text-slate-600">{p.status ?? '—'}</td>
                  <td className="text-slate-600">{p.pipelineStatus ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
