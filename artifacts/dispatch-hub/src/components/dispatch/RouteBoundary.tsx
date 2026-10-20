import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { ErrorBoundary, type ErrorFallbackProps } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';

function RouteFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div role="alert" className="mx-auto mt-6 max-w-lg rounded-xl border border-err/30 bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2 text-err"><TriangleAlert size={18} /><h1 className="text-lg font-semibold text-foreground">This view stopped working</h1></div>
      <p className="mt-2 text-sm text-muted-foreground">Navigation and the rest of the hub are still available. Retry this view or move to another section.</p>
      {import.meta.env.DEV && <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{error.message || String(error)}</pre>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={resetError} data-testid="button-route-retry"><RotateCcw size={14} /> Retry view</Button>
        <Button asChild variant="outline"><Link href="/">Back to overview</Link></Button>
      </div>
    </div>
  );
}

/** Per-route boundary; resets automatically whenever the route changes. */
export function RouteBoundary({ route, children }: { route: string; children: ReactNode }) {
  return <ErrorBoundary resetKey={route} FallbackComponent={RouteFallback}>{children}</ErrorBoundary>;
}
