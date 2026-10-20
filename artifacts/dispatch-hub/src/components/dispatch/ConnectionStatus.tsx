import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DispatchState } from './useDispatchHub';
import { StatusBadge, clock, type Tone } from './shared';

type Q = DispatchState['hubQ'];
type ErrShape = { status?: number; headers?: Headers | Record<string, string | undefined> } | null;

function retryAfterOf(err: ErrShape, base: number): number | null {
  const h = err?.headers;
  if (!h) return null;
  const raw = typeof (h as Headers).get === 'function'
    ? (h as Headers).get('retry-after')
    : (h as Record<string, string | undefined>)['retry-after'] ?? (h as Record<string, string | undefined>)['Retry-After'];
  if (!raw) return null;
  const secs = Number(raw);
  if (Number.isFinite(secs)) return base + secs * 1000;
  const at = Date.parse(raw);
  return Number.isNaN(at) ? null : at;
}

export function useConnection(q: Q) {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [now, setNow] = useState(() => Date.now());
  const started = useRef<number | null>(null);
  const [failureAt, setFailureAt] = useState(() => Date.now());
  const [lastMs, setLastMs] = useState<number | null>(null);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); window.clearInterval(id); };
  }, []);
  useEffect(() => {
    if (q.isFetching) { if (started.current == null) started.current = Date.now(); }
    else if (started.current != null) { setLastMs(Date.now() - started.current); started.current = null; }
  }, [q.isFetching]);
  useEffect(() => { if (q.failureCount) setFailureAt(Date.now()); }, [q.failureCount, q.failureReason]);

  const err = (q.error || q.failureReason || null) as ErrShape;
  const status = err?.status;
  const retryAt = status === 429 ? retryAfterOf(err, q.errorUpdatedAt || failureAt) : null;
  const retryIn = retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : null;
  const elapsed = q.isFetching && started.current != null ? Math.max(0, now - started.current) : 0;
  const slow = elapsed > 3000;

  let tone: Tone = 'ok', label = 'Live';
  if (!online) { tone = 'err'; label = 'Offline'; }
  else if (status === 429) { tone = 'pending'; label = retryIn ? `Rate limited · retry in ${retryIn}s` : 'Rate limited'; }
  else if (q.isError || q.failureCount > 0) { tone = 'pending'; label = status ? `Reconnecting · HTTP ${status}` : 'Reconnecting'; }
  else if (q.isLoading) { tone = 'pending'; label = 'Connecting'; }
  else if (slow) { tone = 'pending'; label = `Slow response · ${(elapsed / 1000).toFixed(1)}s`; }
  else if (q.isFetching) { tone = 'busy'; label = 'Syncing'; }

  return { online, status, retryIn, slow, elapsed, lastMs, tone, label, updatedAt: q.dataUpdatedAt };
}

export function ConnectionStatus({ q }: { q: Q }) {
  const c = useConnection(q);
  const canRetry = (!c.online || q.isError) && !q.isFetching && !(c.retryIn && c.retryIn > 0);
  return (
    <div className="flex min-w-0 items-center gap-2" data-testid="status-connection" aria-live="polite">
      <StatusBadge tone={c.tone} pulse={c.tone === 'busy'}>{c.label}</StatusBadge>
      <span className="hidden truncate font-mono text-[11px] text-muted-foreground sm:inline tabular">
        {c.updatedAt ? `Updated ${clock(c.updatedAt)}` : 'No data yet'}
        {c.lastMs != null && ` · ${c.lastMs < 1000 ? `${c.lastMs} ms` : `${(c.lastMs / 1000).toFixed(1)} s`}`}
      </span>
      {(q.isError || q.failureCount > 0 || !c.online) && (
        <Button type="button" size="sm" variant="outline" onClick={() => void q.refetch()} disabled={!canRetry} data-testid="button-retry-connection">
          <RefreshCw size={12} className={q.isFetching ? 'animate-spin' : ''} /> Retry
        </Button>
      )}
    </div>
  );
}
