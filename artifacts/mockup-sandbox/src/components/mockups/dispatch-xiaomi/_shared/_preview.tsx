import { createContext, useContext, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import snapshot from './_data.json';

// Read-only design snapshot. No connection to approval/completion APIs.
export const previewHub = {
  hubQ: {
    data: snapshot, isLoading: false, isError: false, isFetching: false,
    refetch: async () => snapshot,
  },
  technicians: snapshot.technicians,
  inventory: snapshot.inventory,
  activity: [...snapshot.activity_log].sort((a, b) => b.id - a.id),
  availableCount: snapshot.technicians.filter((t) => t.status === 'Available').length,
  lowStockCount: snapshot.inventory.filter((i) => i.quantity <= 2).length,
  dispatchedToday: snapshot.activity_log.filter((a) => new Date(a.timestamp).toDateString() === new Date().toDateString()).length,
  analysis: null as null | { result: { issue: string; parts: string[]; urgency: string }; forText: string },
};
export type PreviewHub = typeof previewHub;

const Navigation = createContext<(destination: string) => void>(() => {});
const names: Record<string, string> = {
  '/': 'Overview', '/intake': 'Repair intake', '/map': 'Technician map',
  '/technicians': 'Technicians', '/stock': 'Van stock', '/log': 'Dispatch log',
};

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [destination, setDestination] = useState('');
  return <Navigation.Provider value={(to) => { if (to !== '/') setDestination(to); }}>
    {children}
    <Dialog open={!!destination} onOpenChange={(open) => { if (!open) setDestination(''); }}>
      <DialogContent style={{ maxHeight: '85dvh', overflow: 'auto' }}>
        <DialogHeader>
          <DialogTitle>{names[destination] || 'Overview detail'}</DialogTitle>
          <DialogDescription>Read-only design preview. This remains a separate screen in the running app.</DialogDescription>
        </DialogHeader>
        {destination === '/technicians' && previewHub.technicians.map((t) => <p key={t.id}>{t.name} · {t.status} · {t.zone} · Van {t.van_id}</p>)}
        {destination === '/stock' && <div style={{ display: 'grid', gap: 8 }}>{previewHub.inventory.map((i) => <p key={i.id}>Van {i.van_id} · {i.part_name} · {i.quantity} on hand</p>)}</div>}
        {destination === '/log' && previewHub.activity.map((a) => <p key={a.id}>{a.action_details}</p>)}
        {destination === '/intake' && <p>Repair notes and the customer site are entered on the dedicated Repair intake page. Analysis appears after submission, not on the overview.</p>}
        {destination === '/map' && <p>The separate map screen shows labeled sample locations with technician availability and stock readiness. No historical customer site is inferred for records without a saved location.</p>}
      </DialogContent>
    </Dialog>
  </Navigation.Provider>;
}

export function PreviewLink({ href = '/', onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const show = useContext(Navigation);
  return <a {...props} href={`#${href}`} onClick={(event) => {
    event.preventDefault();
    onClick?.(event);
    show(href);
  }} />;
}
