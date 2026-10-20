import { Link } from 'wouter';
import { Check, Package } from 'lucide-react';
import type { DispatchState } from './useDispatchHub';

export type Hub = { hub: DispatchState };

export function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2);
}
export function dateTime(timestamp: string) {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return timestamp;
  return `${d.toLocaleDateString([], { month: 'short', day: '2-digit' })} · ${d.toLocaleTimeString([], { hour12: false })}`;
}
export function PageHead({ kicker, title, sub, children }: { kicker: string; title: string; sub: string; children?: React.ReactNode }) {
  return (
    <header className="af-topline">
      <div>
        <p className="af-kicker af-eyebrow">{kicker}</p>
        <h1 className="af-title">{title}</h1>
        <p className="af-subtitle">{sub}</p>
      </div>
      {children && <div className="af-actions">{children}</div>}
    </header>
  );
}
export function Card({ title, aside, children, className = '' }: { title: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`af-card ${className}`}>
      <header className="af-card-head"><h2 className="af-card-title">{title}</h2>{aside}</header>
      <div className="af-card-body">{children}</div>
    </section>
  );
}
export function TechRow({ tech }: { tech: { id: number; name: string; status: string; zone: string; van_id: number } }) {
  return (
    <div className="af-tech" data-testid={`technician-${tech.id}`}>
      <div className="af-person">
        <span className="af-avatar">{initials(tech.name)}</span>
        <div className="af-tech-info">
          <div className="af-tech-name">{tech.name}</div>
          <div className="af-tech-sub"><span>{tech.zone}</span><span>Van {tech.van_id}</span></div>
        </div>
      </div>
      <span className={`af-status-tag ${tech.status !== 'Available' ? 'busy' : ''}`}>{tech.status}</span>
    </div>
  );
}
export function PartChips({ parts }: { parts: string[] }) {
  return <div className="af-part-list">{parts.map((p) => <span className="af-part" key={p}><Package size={12} color="#e85a2a" />{p}</span>)}</div>;
}
export function IntakeFirst({ text }: { text: string }) {
  return (
    <div className="af-card"><div className="af-empty">
      <strong>{text}</strong>
      <p>Analysis and approval open after a repair intake is submitted.</p>
      <Link href="/intake" className="af-linkbtn">Go to repair intake</Link>
    </div></div>
  );
}
export { Check };
