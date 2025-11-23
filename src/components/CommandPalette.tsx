import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type CommandItem = {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  href?: string;
  badge?: string;
  action?: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  commands: CommandItem[];
  fallbackLabel?: string | null;
  fallbackAction?: (() => void) | null;
};

export function CommandPalette({
  open,
  query,
  onQueryChange,
  onClose,
  commands,
  fallbackLabel,
  fallbackAction
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      inputRef.current?.focus();
    }
  }, [open]);

  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalized) return commands.slice(0, 12);
    return commands
      .map((item) => {
        const haystack = [
          item.label,
          item.description ?? '',
          ...(item.keywords ?? [])
        ]
          .join(' ')
          .toLowerCase();
        const score = haystack.includes(normalized) ? 1 : 0;
        return { item, score };
      })
      .filter(({ score }) => score > 0)
      .slice(0, 24)
      .map(({ item }) => item);
  }, [commands, normalized]);

  const showFallback = normalized && filtered.length === 0 && fallbackLabel && fallbackAction;
  const list = showFallback
    ? [
        ...filtered,
        {
          id: 'fallback',
          label: fallbackLabel ?? '',
          action: fallbackAction ?? undefined
        }
      ]
    : filtered;

  const handleSelect = (item: CommandItem) => {
    if (item.action) {
      item.action();
    } else if (item.href) {
      window.open(item.href, '_blank');
    }
    onClose();
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'ArrowDown' && list.length > 0) {
        event.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, list.length - 1));
      }
      if (event.key === 'ArrowUp' && list.length > 0) {
        event.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const item = list[activeIndex];
        if (item) {
          handleSelect(item);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeIndex, list, onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 px-4 py-16 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[16px] border border-white/50 bg-white/70 shadow-[0_24px_60px_rgba(15,23,42,0.25)] backdrop-blur-2xl dark:border-white/20 dark:bg-[#0f172a]/70 dark:shadow-[0_30px_70px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-3 border-b border-white/50 bg-white/60 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          <Input
            ref={inputRef}
            placeholder="Quick command or search…"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="flex-1 rounded-[10px] border-[#E2E8F0] bg-white/80 text-[#0F172A] placeholder:text-slate-400 focus:border-[#3A7AFE] focus:ring-2 focus:ring-[#3A7AFE]/30 dark:border-[#334155] dark:bg-[#1E293B]/80 dark:text-white"
          />
          <div className="hidden items-center gap-1 text-[11px] uppercase tracking-[0.2em] text-slate-400 sm:flex dark:text-slate-500">
            <kbd className="rounded-[8px] border border-slate-200 bg-white/80 px-2 py-1 text-xs text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white">
              ⌘
            </kbd>
            <kbd className="rounded-[8px] border border-slate-200 bg-white/80 px-2 py-1 text-xs text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white">
              K
            </kbd>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto bg-white/60 backdrop-blur-xl dark:bg-white/5">
          {list.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-300">No matches yet.</p>
          )}

          <ul className="divide-y divide-white/60 dark:divide-white/10">
            {list.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left transition',
                    activeIndex === index
                      ? 'bg-[#3A7AFE]/10 text-[#0F172A] shadow-inner dark:bg-[#3A7AFE]/20 dark:text-white'
                      : 'hover:bg-white/70 dark:hover:bg-white/10'
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-white">{item.label}</p>
                    {item.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-300">{item.description}</p>
                    )}
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-[#E6F0FF] px-2 py-1 text-[11px] font-semibold text-[#3A7AFE] dark:bg-[#1E3A8A] dark:text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-between border-t border-white/50 bg-white/60 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:border-white/10 dark:bg-white/10 dark:text-slate-500">
          <span>Command palette</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 rounded-[10px] px-2 text-[11px] text-slate-500 hover:text-[#3A7AFE] dark:text-slate-300"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
