export function Panel({ step, title, icon: Icon, right, children, className = '' }) {
  return (
    <section className={`rise flex min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-900/60 shadow-[0_1px_0_0_rgba(148,163,184,0.04)_inset] backdrop-blur ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] font-medium text-slate-500">{step}</span>
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-800 bg-slate-950 text-sky-400">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-sm font-semibold tracking-tight text-slate-100">{title}</h2>
        </div>
        {right}
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">{children}</div>
    </section>
  );
}

const TONES = {
  red: 'border-red-500/30 bg-red-500/10 text-red-300',
  yellow: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  sky: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  slate: 'border-slate-700 bg-slate-800/60 text-slate-300',
  violet: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
};

export function Badge({ tone = 'slate', children, className = '', ...rest }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none transition-colors ${TONES[tone]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}

export function Dot({ tone = 'green', pulse = false }) {
  const c = { green: 'bg-emerald-400', red: 'bg-red-400', yellow: 'bg-amber-300', slate: 'bg-slate-500' }[tone];
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && <span className={`absolute inset-0 animate-ping rounded-full opacity-60 ${c}`} />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${c}`} />
    </span>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-slate-800/70 ${className}`} />;
}

export function SectionLabel({ children, right }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{children}</span>
      {right}
    </div>
  );
}
