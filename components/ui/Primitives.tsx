import type { ReactNode } from 'react';

type Tone = 'neutral' | 'under' | 'over' | 'warn' | 'info';

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-[var(--text)]',
  under: 'text-[var(--under)]',
  over: 'text-[var(--over)]',
  warn: 'text-[var(--warn)]',
  info: 'text-[var(--info)]',
};

const BADGE_TONE: Record<Tone | 'brand', string> = {
  neutral: 'bg-[var(--surface-2)] text-[var(--text-muted)]',
  under: 'bg-[var(--under-bg)] text-[var(--under)]',
  over: 'bg-[var(--over-bg)] text-[var(--over)]',
  warn: 'bg-[var(--warn-bg)] text-[var(--warn)]',
  info: 'bg-[var(--info-bg)] text-[var(--info)]',
  brand: 'bg-[var(--brand-orange)] text-white',
};

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
          {title}
        </h1>
        {subtitle && (
          <div className="mt-1 text-sm text-[var(--text-muted)]">
            {subtitle}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}

/** A headline number. `tone` colours the value; the label always carries the meaning. */
export function StatTile({
  label,
  value,
  sub,
  tone = 'neutral',
  emphasis = false,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-[var(--surface)] border-[var(--border)] p-5 ${
        emphasis ? 'border-l-4 border-l-[var(--brand-orange)]' : ''
      }`}
    >
      <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
      <div className={`tabular mt-2 text-2xl font-semibold ${TONE_TEXT[tone]}`}>
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-xs text-[var(--text-muted)] leading-snug">
          {sub}
        </div>
      )}
    </div>
  );
}

export function Card({
  children,
  className,
  emphasis,
}: {
  children: ReactNode;
  className?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-[var(--surface)] border-[var(--border)] overflow-hidden ${
        emphasis ? 'border-l-4 border-l-[var(--brand-orange)]' : ''
      } ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--text)]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: Tone | 'brand';
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${BADGE_TONE[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-sm font-medium text-[var(--text)]">{title}</p>
      {hint && (
        <p className="mt-1 text-sm text-[var(--text-muted)]">{hint}</p>
      )}
    </div>
  );
}

/** Wide tables must scroll inside their own box, never the page body. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="w-full overflow-x-auto">{children}</div>;
}
