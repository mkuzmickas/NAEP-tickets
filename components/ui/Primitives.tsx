import type { ReactNode } from 'react';

type Tone = 'neutral' | 'under' | 'over' | 'warn' | 'info';

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-enbridge-black',
  under: 'text-green-700',
  over: 'text-red-700',
  warn: 'text-amber-700',
  info: 'text-blue-700',
};

const TONE_SWATCH: Record<Tone, string> = {
  neutral: 'bg-enbridge-black',
  under: 'bg-green-500',
  over: 'bg-red-500',
  warn: 'bg-amber-500',
  info: 'bg-blue-500',
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
    <header className="flex items-start justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-enbridge-black">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-enbridge-black/60 mt-1 leading-snug">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone = 'neutral',
  emphasis,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        emphasis
          ? 'bg-white border-black/15 ring-1 ring-black/[0.03]'
          : 'bg-white border-black/10'
      }`}
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-enbridge-black/55 font-semibold">
        <span className={`w-1.5 h-1.5 rounded-full ${TONE_SWATCH[tone]}`} />
        {label}
      </div>
      <div
        className={`text-3xl font-semibold tabular-nums mt-2 ${TONE_TEXT[tone]}`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-enbridge-black/55 mt-1 leading-tight">
          {sub}
        </div>
      )}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-lg border border-black/10 overflow-hidden ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="px-5 py-3 border-b border-black/10 flex items-start justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <div className="font-mono text-sm font-semibold text-enbridge-black">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-enbridge-black/60 mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
      {right && <div className="text-right shrink-0">{right}</div>}
    </div>
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
    <div className="px-6 py-10 text-center text-enbridge-black/55 text-sm">
      <div className="font-medium text-enbridge-black/70">{title}</div>
      {hint && <div className="text-xs mt-1">{hint}</div>}
    </div>
  );
}
