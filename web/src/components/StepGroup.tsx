import type { Step } from '../lib/api';

interface Props {
  steps: Step[];
}

const ICON: Record<string, string> = {
  read: '◎',
  search: '🔍',
  write: '✎',
  check: '✓',
  fix: '↺',
  think: '⚡',
};

// Renders the agent activity feed (server/agent.go Step events, merged by id)
// as a compact vertical list — one row per step, icon swaps for a spinner
// while it's in flight.
export default function StepGroup({ steps }: Props) {
  if (steps.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        fontSize: 13,
      }}
    >
      {steps.map((s) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {s.status === 'start' ? (
            <span className="spinner" style={{ width: 11, height: 11, borderWidth: 1.5, flexShrink: 0 }} />
          ) : (
            <span
              style={{
                width: 14,
                textAlign: 'center',
                flexShrink: 0,
                color: s.status === 'error' ? '#f87171' : 'var(--fg-dim)',
              }}
            >
              {s.status === 'error' ? '✕' : ICON[s.kind] ?? '·'}
            </span>
          )}
          <span style={{ color: s.status === 'error' ? '#f87171' : 'var(--fg-muted)' }}>{s.label}</span>
          {s.target && (
            <span
              style={{
                color: 'var(--fg-dim)',
                fontFamily: 'var(--mono)',
                fontSize: 12,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {s.target}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
