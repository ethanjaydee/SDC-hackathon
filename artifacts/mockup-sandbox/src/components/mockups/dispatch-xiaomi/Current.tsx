import './_group.css';
import Shell from './_shared/Shell';
import { PreviewProvider } from './_shared/_preview';

export function Current() {
  return <PreviewProvider><Shell /></PreviewProvider>;
}
