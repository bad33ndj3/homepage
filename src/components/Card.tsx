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
        'rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30 backdrop-blur',
        className
      )}
    >
      {(title || subtitle || actions) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
            {subtitle && <p className="text-sm text-slate-300">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 text-sm text-slate-200">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
