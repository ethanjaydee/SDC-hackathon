import { Link } from 'wouter';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-secondary text-muted-foreground"><Compass size={20} /></span>
      <p className="mt-4 font-mono text-xs text-primary">404</p>
      <h1 className="mt-1 text-2xl font-semibold">No route here</h1>
      <p className="mt-2 text-sm text-muted-foreground">This address does not match any Dispatch Hub section.</p>
      <Button asChild className="mt-5"><Link href="/">Back to overview</Link></Button>
    </div>
  );
}
