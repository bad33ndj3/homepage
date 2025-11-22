import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ThemeToggle } from './ThemeToggle';

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
};

export function SettingsModal({ open, onClose, children }: SettingsModalProps) {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6 backdrop-blur">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-white shadow-2xl">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Settings</p>
            <h2 className="text-xl font-semibold">Personalize your dashboard</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 transition hover:border-accent hover:text-accent"
          >
            Close
          </button>
        </header>
        <div className="space-y-6">
          <section>
            <p className="text-sm font-semibold text-slate-100">Theme</p>
            <p className="text-xs text-slate-400">Switch between light/dark or follow your OS preference.</p>
            <div className="mt-3">
              <ThemeToggle />
            </div>
          </section>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
