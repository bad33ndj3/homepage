import { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ThemeToggle } from './ThemeToggle';
import { ThemePreference } from '@/hooks/useTheme';
import { BACKGROUND_THEMES } from './GlassBackground';

type ThemeControls = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference | ((prev: ThemePreference) => ThemePreference)) => void;
  resolvedTheme: 'light' | 'dark';
};

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  theme: ThemeControls;
  backgroundTheme?: string;
  onBackgroundChange?: (theme: string) => void;
};

export function SettingsModal({
  open,
  onClose,
  children,
  theme,
  backgroundTheme = 'forest',
  onBackgroundChange
}: SettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="max-w-md rounded-3xl border border-white/30 bg-white/40 text-[#0F172A] shadow-[0_16px_48px_rgba(31,38,135,0.3)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/20 dark:bg-black/40 dark:text-white dark:shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
        <DialogHeader className="items-start gap-1 text-left">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Settings</p>
          <DialogTitle className="text-2xl font-semibold text-[#0F172A] dark:text-white">Personalize your dashboard</DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-300">
            Switch themes and tune widgets to match your workflow.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <section>
            <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">Theme</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Switch between light/dark or follow your OS preference.</p>
            <div className="mt-3">
              <ThemeToggle {...theme} />
            </div>
          </section>

          {onBackgroundChange && (
            <section>
              <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">Background</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Choose from beautiful 4K nature scenes.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {Object.entries(BACKGROUND_THEMES).map(([key, bg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onBackgroundChange(key)}
                    className={`group relative overflow-hidden rounded-xl border-2 transition-all ${
                      backgroundTheme === key
                        ? 'border-[#3A7AFE] shadow-[0_0_0_2px_rgba(58,122,254,0.2)]'
                        : 'border-white/30 hover:border-white/50 dark:border-white/20'
                    }`}
                  >
                    <div className="aspect-video overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
                      <img
                        src={bg.light}
                        alt={bg.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="text-sm font-semibold text-white">{bg.name}</p>
                    </div>
                    {backgroundTheme === key && (
                      <div className="absolute right-2 top-2 rounded-full bg-[#3A7AFE] p-1">
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
