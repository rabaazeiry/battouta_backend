import { FiGithub, FiHeart } from 'react-icons/fi';

const SYSTEM_NAME = 'PFE Marketing Intelligence Agent';
const YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-brand-600 text-white grid place-items-center text-[10px] font-bold">
            PM
          </span>
          <span className="font-medium text-slate-700">{SYSTEM_NAME}</span>
          <span className="hidden sm:inline">·</span>
          <span>v0.1.0</span>
        </div>

        <div className="flex items-center gap-4">
          <span>
            © {YEAR} {SYSTEM_NAME}. All rights reserved.
          </span>
          <a
            href="https://github.com/rabaazeiry"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-slate-800"
          >
            <FiGithub /> GitHub
          </a>
          <span className="inline-flex items-center gap-1">
            Built with <FiHeart className="text-red-500" /> by Rabaa Zeiri
          </span>
        </div>
      </div>
    </footer>
  );
}
