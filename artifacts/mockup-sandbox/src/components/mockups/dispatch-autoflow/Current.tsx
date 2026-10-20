import './_group.css';
import Dashboard from './_shared/Dashboard';
import { DemoHubProvider } from './_shared/_api';
import { Toaster } from '@/components/ui/toaster';

export function Current() {
  return <DemoHubProvider><Dashboard /><Toaster /></DemoHubProvider>;
}
