import type { Ref } from 'react';
import { ChevronRight } from 'lucide-react';

type StatusRingProps = {
  numerator: number;
  denominator: number;
  label: string;
  criteria: string;
  color: string;
  ready: boolean;
  expanded: boolean;
  onClick: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
};

export default function StatusRing({
  numerator, denominator, label, criteria, color, ready, expanded, onClick, buttonRef,
}: StatusRingProps) {
  const fraction = ready && denominator > 0 ? Math.min(1, Math.max(0, numerator / denominator)) : 0;
  const circumference = 2 * Math.PI * 47;
  const percentage = denominator > 0 && ready ? `${Math.round(fraction * 100)}%` : '—';
  const available = ready && denominator > 0;

  return (
    <button
      ref={buttonRef}
      className="xo-ring-card"
      type="button"
      disabled={!available}
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={expanded ? 'hub-readiness-detail' : undefined}
      aria-label={ready
        ? `${label}: ${numerator} of ${denominator}. ${criteria}.${available ? ' Select to view details.' : ' No records yet.'}`
        : `${label}: data not available yet.`}
    >
      <span className="xo-ring" aria-hidden="true">
        <svg viewBox="0 0 110 110">
          <circle className="xo-ring-track" cx="55" cy="55" r="47" />
          <circle
            className="xo-ring-value"
            cx="55" cy="55" r="47"
            style={{
              stroke: color,
              strokeDasharray: circumference,
              strokeDashoffset: circumference * (1 - fraction),
              opacity: fraction > 0 ? 1 : 0,
            }}
          />
        </svg>
        <span className="xo-ring-center">
          <span className="xo-ring-number">
            {ready ? numerator : '—'}
            {ready && <span style={{ color: '#99a69f', fontSize: 14, letterSpacing: '-.04em' }}>/{denominator}</span>}
          </span>
          <span className="xo-ring-percent">{percentage}</span>
        </span>
      </span>
      <span className="xo-ring-label">{label}</span>
      <span className="xo-ring-criteria">{criteria}</span>
      <span className="xo-ring-hint">
        <ChevronRight size={11} />
        {!ready ? 'Waiting for data' : !denominator ? 'No records yet' : expanded ? 'Details open' : 'View detail'}
      </span>
    </button>
  );
}
