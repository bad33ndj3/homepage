import type { PropsWithChildren, ReactNode } from 'react';
import clsx from 'clsx';

type CardProps = PropsWithChildren<{
  title?: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  actions?: ReactNode;
}>;

export function Card({ title, subtitle, actions, className, children }: CardProps) {
  return (
    <section
      className={clsx(
        'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-black/30',
        className
      )}
    >
      {(title || subtitle || actions) && (
        <header className="mb-3 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>}
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-300">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-200">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
