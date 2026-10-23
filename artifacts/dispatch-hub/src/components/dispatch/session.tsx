import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type DemoSession = { role: 'boss' } | { role: 'technician'; technicianId: number };
const KEY = 'dispatch-demo-session';

function read(): DemoSession | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { role?: string; technicianId?: unknown };
    if (v.role === 'boss') return { role: 'boss' };
    if (v.role === 'technician' && Number.isSafeInteger(v.technicianId) && (v.technicianId as number) > 0) return { role: 'technician', technicianId: v.technicianId as number };
  } catch { /* storage unavailable */ }
  return null;
}

type Ctx = { session: DemoSession | null; choose: (s: DemoSession) => void; signOut: () => void };
const SessionCtx = createContext<Ctx>({ session: null, choose: () => {}, signOut: () => {} });

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(read);
  const choose = useCallback((s: DemoSession) => {
    try { window.sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
    setSession(s);
  }, []);
  const signOut = useCallback(() => {
    try { window.sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    setSession(null);
  }, []);
  const value = useMemo(() => ({ session, choose, signOut }), [session, choose, signOut]);
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useDemoSession() {
  const ctx = useContext(SessionCtx);
  const technicianId = ctx.session?.role === 'technician' ? ctx.session.technicianId : null;
  return { ...ctx, isTechnician: technicianId !== null, technicianId };
}
