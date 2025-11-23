import { Button } from '@/components/ui/button';
import { ThemePreference } from '../hooks/useTheme';

const options: { label: string; value: ThemePreference }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' }
];

type ThemeToggleProps = {
  preference: ThemePreference;
  setPreference: (value: ThemePreference | ((prev: ThemePreference) => ThemePreference)) => void;
  resolvedTheme: 'light' | 'dark';
};

export function ThemeToggle({ preference, setPreference, resolvedTheme }: ThemeToggleProps) {
  return (
    <div className="flex flex-col gap-2 text-xs text-slate-300">
      <div className="flex flex-wrap items-center gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={preference === option.value ? 'default' : 'outline'}
            onClick={() => setPreference(option.value)}
            aria-pressed={preference === option.value}
            className="text-xs font-semibold"
          >
            {option.label}
          </Button>
        ))}
      </div>
      <span className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {resolvedTheme} mode
      </span>
    </div>
  );
}
