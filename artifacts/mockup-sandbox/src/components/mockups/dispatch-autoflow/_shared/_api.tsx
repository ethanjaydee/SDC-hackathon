// Canvas-only state adapter: the live application's API is not changed.
import { createContext, useContext, useState, type ReactNode } from 'react';
import initialHub from './_data.json';

type Hub = typeof initialHub;
const Context = createContext<{ hub: Hub; setHub: (hub: Hub) => void } | null>(null);

export function DemoHubProvider({ children }: { children: ReactNode }) {
  const [hub, setHub] = useState<Hub>(structuredClone(initialHub));
  return <Context.Provider value={{ hub, setHub }}>{children}</Context.Provider>;
}

function useHub() {
  const value = useContext(Context);
  if (!value) throw new Error('The design preview needs DemoHubProvider.');
  return value;
}

export function getGetHubDataQueryKey() { return ['canvas-dispatch-hub']; }

export function useGetHubData(_options?: unknown) {
  const { hub } = useHub();
  return {
    data: hub, isError: false, isLoading: false, isFetching: false,
    error: null, dataUpdatedAt: Date.now(), refetch: async () => ({ data: hub }),
  };
}

export function useQueryClient() {
  const { setHub } = useHub();
  return {
    cancelQueries: async (_options?: unknown) => {},
    setQueryData: (_key: unknown, data: Hub) => setHub(data),
    invalidateQueries: async (_options?: unknown) => {},
  };
}

export function useAnalyzeRequest() {
  const [isPending, setPending] = useState(false);
  return {
    isPending,
    mutateAsync: async (_input: { data: { text: string } }) => {
      setPending(true);
      await new Promise((resolve) => setTimeout(resolve, 650));
      setPending(false);
      return {
        issue: 'Instrument Cluster Power Failure',
        parts: ['100uF Capacitor', 'NPN Transistor'],
        urgency: 'High',
      };
    },
  };
}

export function useApproveDispatch() {
  const { hub, setHub } = useHub();
  const [isPending, setPending] = useState(false);
  return {
    isPending,
    mutateAsync: async ({ data }: { data: { tech_id: number; van_id: number; parts: string[]; approved_by: string } }) => {
      setPending(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const tech = hub.technicians.find((t) => t.id === data.tech_id);
        const updated = {
          technicians: hub.technicians.map((t) => t.id === data.tech_id ? { ...t, status: 'Busy' } : t),
          inventory: hub.inventory.map((item) => ({
            ...item,
            quantity: item.quantity - (item.van_id === data.van_id ? data.parts.filter((part) => part === item.part_name).length : 0),
          })),
          activity_log: [{
            id: Date.now(), timestamp: new Date().toISOString(),
            action_details: `Dispatch approved: ${tech?.name} · Van ${data.van_id} · ${data.parts.join(', ')}. Technician set to Busy; stock allocated.`,
            approved_by: data.approved_by,
          }, ...hub.activity_log],
        };
        setHub(updated as Hub);
        return updated as Hub;
      } finally { setPending(false); }
    },
  };
}
