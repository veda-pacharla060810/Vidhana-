import { useState } from 'react';
import { formatDuration } from '../lib/dates.js';

const CATEGORY_COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)'];
export const colorFor = (i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length];

function niceMax(maxMinutes) {
  if (maxMinutes <= 0) return 60;
  const steps = [15, 30, 60, 90, 120, 180, 240, 360, 480, 600, 720, 960, 1200, 1440, 2400, 3600, 6000, 12000];
  return steps.find((s) => s >= maxMinutes) || Math.ceil(maxMinutes / 6000) * 6000;
}

function axisLabel(min) {
  if (min === 0) return '0';
  if (min < 60) return `${min}m`;
  const h = min / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}

// Vertical bar chart. data: [{ key, label, sublabel?, ms, highlight? }]
export function BarChart({ data, height = 200, ariaLabel }) {
  const [hover, setHover] = useState(null);
  const maxMin = niceMax(Math.max(...data.map((d) => d.ms / 60000), 0));
  const ticks = [0, maxMin / 2, maxMin];
  const showEvery = data.length > 16 ? Math.ceil(data.length / 8) : 1;

  return (
    <figure className="chart" aria-label={ariaLabel}>
      <div className="bar-chart" style={{ height }}>
        <div className="bar-axis" aria-hidden="true">
          {[...ticks].reverse().map((t) => (
            <span key={t}>{axisLabel(Math.round(t))}</span>
          ))}
        </div>
        <div className="bar-plot">
          <div className="bar-grid" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="bars">
            {data.map((d, i) => {
              const pct = (d.ms / 60000 / maxMin) * 100;
              return (
                <div
                  key={d.key}
                  className="bar-col"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${d.label}${d.sublabel ? ` ${d.sublabel}` : ''}: ${formatDuration(d.ms)}`}
                >
                  {hover === i && (
                    <span className="bar-tip" role="tooltip">
                      <strong>{formatDuration(d.ms)}</strong>
                      <span>{d.tip || d.label}</span>
                    </span>
                  )}
                  <span
                    className={`bar ${d.highlight ? 'bar-highlight' : ''} ${d.ms === 0 ? 'bar-zero' : ''}`}
                    style={{ height: d.ms > 0 ? `max(${pct}%, 3px)` : '2px' }}
                  />
                  <span className="bar-label" aria-hidden="true">
                    {i % showEvery === 0 || i === data.length - 1 ? d.label : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </figure>
  );
}

// Horizontal ranked bars. data: [{ label, ms }]
export function RankedBars({ data, total, limit = 8, colored = true }) {
  const rows = data.slice(0, limit);
  const rest = data.slice(limit);
  const restMs = rest.reduce((a, r) => a + r.ms, 0);
  const max = Math.max(...rows.map((r) => r.ms), 1);
  return (
    <ul className="ranked">
      {rows.map((r, i) => (
        <li key={r.label} className="ranked-row">
          <div className="ranked-head">
            <span className="ranked-label">
              {colored && <span className="swatch" style={{ background: colorFor(i) }} />}
              <span className="truncate" title={r.label}>
                {r.label}
              </span>
            </span>
            <span className="ranked-value num">
              {formatDuration(r.ms)}
              {total > 0 && <span className="muted"> · {Math.round((r.ms / total) * 100)}%</span>}
            </span>
          </div>
          <div className="ranked-track">
            <span className="ranked-fill" style={{ width: `${(r.ms / max) * 100}%`, background: colored ? colorFor(i) : undefined }} />
          </div>
        </li>
      ))}
      {rest.length > 0 && (
        <li className="ranked-more muted small">
          +{rest.length} more · {formatDuration(restMs)}
        </li>
      )}
    </ul>
  );
}

// Stacked single bar (category share)
export function ShareBar({ data, total }) {
  if (total <= 0) return null;
  return (
    <div className="share-bar" role="img" aria-label={data.map((d) => `${d.label} ${Math.round((d.ms / total) * 100)}%`).join(', ')}>
      {data.map((d, i) => (
        <span key={d.label} style={{ width: `${(d.ms / total) * 100}%`, background: colorFor(i) }} title={`${d.label}: ${formatDuration(d.ms)}`} />
      ))}
    </div>
  );
}

export function ProgressRing({ value, size = 64, stroke = 6, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="progress-ring" role="img" aria-label={label}>
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className="ring-fill"
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - v)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
