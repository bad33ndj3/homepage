import { ThemePreference, useTheme } from '../hooks/useTheme';

const options: { label: string; value: ThemePreference }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' }
];

export function ThemeToggle() {
  const { preference, setPreference, resolvedTheme } = useTheme();

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
      <span>Theme</span>
      <div className="flex overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setPreference(option.value)}
            className={
              'px-3 py-1 text-xs font-medium transition ' +
              (preference === option.value
                ? 'bg-accent text-slate-900'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10')
            }
          >
            {option.label}
          </button>
        ))}
      </div>
      <span className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {resolvedTheme} mode
      </span>
    </div>
  );
}
