import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { CheckCircle2, ChevronsRight, Loader2, TriangleAlert } from 'lucide-react';

type Status = 'idle' | 'pending' | 'success' | 'failed';
const HANDLE = 48;

type Props = {
  onConfirm: () => Promise<boolean>;
  disabled?: boolean;
  /** Changing this value resets the control (identity, site, technician, analysis). */
  resetKey: string;
  idleLabel?: string;
  disabledLabel?: string;
  testId?: string;
};

export function SlideToApprove({ onConfirm, disabled, resetKey, idleLabel = 'Slide to approve & dispatch', disabledLabel = 'Approval unavailable', testId = 'slide-approve' }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startPos: number; max: number } | null>(null);
  const busy = useRef(false);
  const keyRef = useRef(resetKey);
  const [pos, setPos] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  useEffect(() => {
    keyRef.current = resetKey;
    busy.current = false;
    drag.current = null;
    setPos(0); setStatus('idle'); setDragging(false);
  }, [resetKey]);

  useEffect(() => { if (disabled && status === 'idle') setPos(0); }, [disabled, status]);

  const confirm = useCallback(async () => {
    if (busy.current || disabled) return;
    busy.current = true;
    const key = keyRef.current;
    setPos(1); setStatus('pending');
    let ok = false;
    try { ok = await onConfirmRef.current(); } catch { ok = false; }
    if (keyRef.current !== key) return;
    if (ok) { setStatus('success'); }
    else { busy.current = false; setStatus('failed'); setPos(0); }
  }, [disabled]);

  const locked = disabled || status === 'pending' || status === 'success';

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (locked || !track.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startPos: pos, max: Math.max(1, track.current.clientWidth - HANDLE - 8) };
    setDragging(true);
    if (status === 'failed') setStatus('idle');
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current; if (!d) return;
    setPos(Math.min(1, Math.max(0, d.startPos + (e.clientX - d.startX) / d.max)));
  };
  const onUp = () => {
    const started = drag.current;
    if (!started) return;
    drag.current = null; setDragging(false);
    if (pos >= 0.92 && started.startPos < 0.1) void confirm(); else setPos(0);
  };
  const onCancel = () => { drag.current = null; setDragging(false); setPos(0); };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (locked) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setPos((p) => Math.min(1, p + 0.25)); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setPos((p) => Math.max(0, p - 0.25)); }
    else if (e.key === 'End') { e.preventDefault(); setPos(1); }
    else if (e.key === 'Home' || e.key === 'Escape') { e.preventDefault(); setPos(0); }
    else if (e.key === 'Enter') { e.preventDefault(); if (pos >= 0.99) void confirm(); }
  };

  const label = status === 'pending' ? 'Allocating parts…' : status === 'success' ? 'Dispatch approved' : disabled ? disabledLabel : idleLabel;
  const maxPx = track.current ? Math.max(0, track.current.clientWidth - HANDLE - 8) : 0;
  return (
    <div className="space-y-1.5">
      <div ref={track} data-testid={testId} data-status={status}
        className={`relative h-14 select-none overflow-hidden rounded-full border p-1 transition-colors duration-300 motion-reduce:transition-none ${status === 'success' ? 'border-ok/40 bg-ok/15' : status === 'failed' ? 'border-err/40 bg-err/[0.07]' : disabled ? 'border-card-border bg-muted/50 opacity-70' : 'border-ok/30 bg-ok/[0.07]'}`}>
        <div aria-hidden="true" className="absolute inset-y-0 left-0 bg-ok/20" style={{ width: `${HANDLE + pos * maxPx}px`, transition: dragging ? 'none' : 'width .25s ease' }} />
        <span className="pointer-events-none absolute inset-0 grid place-items-center pl-10 text-sm font-medium text-foreground/80" aria-live="polite">{label}</span>
        <div role="slider" tabIndex={locked ? -1 : 0} aria-label="Slide right to approve dispatch" aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={Math.round(pos * 100)} aria-valuetext={pos >= 0.99 ? 'Ready. Press Enter to confirm.' : `${Math.round(pos * 100)} percent`}
          aria-disabled={locked} aria-describedby={`${testId}-help`} data-testid={`${testId}-handle`}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel} onKeyDown={onKey}
          style={{ width: HANDLE, height: HANDLE, transform: `translateX(${pos * maxPx}px)`, transition: dragging ? 'none' : 'transform .25s cubic-bezier(.2,.7,.2,1)', touchAction: 'none' }}
          className={`relative z-10 grid place-items-center rounded-full bg-ok text-white shadow-md ${locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'} motion-reduce:!transition-none`}>
          {status === 'pending' ? <Loader2 size={18} className="animate-spin" /> : status === 'success' ? <CheckCircle2 size={18} /> : <ChevronsRight size={18} />}
        </div>
      </div>
      <p id={`${testId}-help`} className="text-[11px] text-muted-foreground">Drag right, or focus the handle, press End, then Enter. Clicking the track does nothing.</p>
      {status === 'failed' && <p role="alert" className="flex items-center gap-1.5 text-xs text-err"><TriangleAlert size={12} /> Approval did not go through. Check the message above, then slide again.</p>}
    </div>
  );
}
