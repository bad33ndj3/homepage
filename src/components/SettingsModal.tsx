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
};

export function SettingsModal({ open, onClose, children, theme }: SettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="max-w-md rounded-3xl border border-white/10 bg-slate-900/95 text-white shadow-2xl">
        <DialogHeader className="items-start gap-1 text-left">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Settings</p>
          <DialogTitle className="text-2xl font-semibold text-white">Personalize your dashboard</DialogTitle>
          <DialogDescription className="text-sm text-slate-300">
            Switch themes and tune widgets to match your workflow.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <section>
            <p className="text-sm font-semibold text-slate-100">Theme</p>
            <p className="text-xs text-slate-400">Switch between light/dark or follow your OS preference.</p>
            <div className="mt-3">
              <ThemeToggle {...theme} />
            </div>
          </section>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
