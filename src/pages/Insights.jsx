import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { BarChart, RankedBars, ShareBar } from '../components/Charts.jsx';
import { useStore } from '../state/store.jsx';
import { useToday } from '../state/hooks.js';
import { addDays, formatDuration, formatShortDate, formatWeekday, fromDateKey } from '../lib/dates.js';
import { byCategory, byTask, dailySeries, daysBetween, firstSessionDay, sessionDay, sumDuration, weeklySeries } from '../lib/stats.js';

const RANGES = [
  { id: '7', label: '7 days', days: 7 },
  { id: '30', label: '30 days', days: 30 },
  { id: '90', label: '90 days', days: 90 },
  { id: 'all', label: 'All time', days: null },
];

function Metric({ label, value, foot }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  );
}

export default function Insights() {
  const { state } = useStore();
  const today = useToday();
  const [rangeId, setRangeId] = useState('7');
  const { sessions, tasks } = state;

  if (sessions.length === 0) {
    return (
      <div>
        <header className="page-head">
          <div>
            <h1 className="page-title">Time Insights</h1>
            <p className="page-sub">Charts built only from the sessions you track.</p>
          </div>
        </header>
        <section className="card">
          <EmptyState
            icon="insights"
            title="No tracked time yet"
            action={
              <Link to="/focus" className="btn btn-primary">
                <Icon name="play" size={14} /> Start a focus session
              </Link>
            }
          >
            Start a focus session, or log a past one, and VEXA will show where your time goes: by day, by week, by category and by task.
          </EmptyState>
        </section>
      </div>
    );
  }

  const range = RANGES.find((r) => r.id === rangeId);
  const first = firstSessionDay(sessions);
  const fromKey = range.days ? addDays(today, -(range.days - 1)) : first < today ? first : today;
  const spanDays = daysBetween(fromKey, today) + 1;
  const inRange = sessions.filter((s) => {
    const d = sessionDay(s);
    return d >= fromKey && d <= today;
  });
  const total = sumDuration(inRange);
  const activeDays = new Set(inRange.map(sessionDay)).size;
  const categories = byCategory(inRange);
  const perTask = byTask(inRange, tasks);

  // Previous equal-length period, for comparison.
  const prevFrom = addDays(fromKey, -spanDays);
  const prevTo = addDays(fromKey, -1);
  const prevTotal = range.days
    ? sumDuration(sessions.filter((s) => sessionDay(s) >= prevFrom && sessionDay(s) <= prevTo))
    : null;
  const delta = prevTotal !== null && prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;

  const useWeekly = spanDays > 31;
  const activity = useWeekly
    ? weeklySeries(sessions, Math.min(104, Math.ceil(spanDays / 7)), today).map((w) => ({
        key: w.key,
        ms: w.ms,
        label: formatShortDate(w.key),
        tip: `Week of ${formatShortDate(w.key)}`,
      }))
    : dailySeries(sessions, fromKey, today).map((d) => ({
        key: d.key,
        ms: d.ms,
        label: spanDays <= 7 ? formatWeekday(d.key) : String(fromDateKey(d.key).getDate()),
        tip: `${formatWeekday(d.key)}, ${formatShortDate(d.key)}`,
        highlight: d.key === today,
      }));

  const weeks = weeklySeries(sessions, 8, today).map((w, i, arr) => ({
    key: w.key,
    ms: w.ms,
    label: i === arr.length - 1 ? 'This wk' : formatShortDate(w.key),
    tip: i === arr.length - 1 ? 'This week' : `Week of ${formatShortDate(w.key)}`,
    highlight: i === arr.length - 1,
  }));
  const thisWeek = weeks[weeks.length - 1].ms;
  const lastWeek = weeks[weeks.length - 2].ms;

  return (
    <div>
      <header className="page-head">
        <div>
          <h1 className="page-title">Time Insights</h1>
          <p className="page-sub">
            {formatShortDate(fromKey)} – {formatShortDate(today)} · built only from sessions you tracked
          </p>
        </div>
        <div className="segmented" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r.id} type="button" aria-pressed={rangeId === r.id} onClick={() => setRangeId(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <section className="stats" aria-label="Summary">
        <Metric
          label="Total tracked"
          value={formatDuration(total)}
          foot={delta !== null ? `${delta >= 0 ? '+' : ''}${delta}% vs previous ${range.days} days` : prevTotal === 0 ? 'No time in the previous period' : `Since ${formatShortDate(fromKey)}`}
        />
        <Metric label="Sessions completed" value={inRange.length} foot={`${activeDays} active day${activeDays === 1 ? '' : 's'}`} />
        <Metric label="Average session" value={inRange.length ? formatDuration(total / inRange.length) : '—'} foot={inRange.length ? 'Focused time per session' : 'No sessions in range'} />
        <Metric
          label="Daily average"
          value={formatDuration(total / spanDays)}
          foot={activeDays ? `${formatDuration(total / activeDays)} on active days` : 'No active days in range'}
        />
      </section>

      {inRange.length === 0 ? (
        <section className="card" style={{ marginBottom: 20 }}>
          <EmptyState icon="clock" title="No sessions in this range">
            Choose a longer range above to see older activity.
          </EmptyState>
        </section>
      ) : null}

      <div className="grid" style={{ marginBottom: 20 }}>
        <section className="card" aria-labelledby="activity-head">
          <div className="card-head">
            <div>
              <h2 className="card-title" id="activity-head">
                {useWeekly ? 'Weekly activity' : 'Daily activity'}
              </h2>
              <p className="card-sub">{useWeekly ? 'Tracked time per week (weeks start Sunday)' : 'Tracked time per day'}</p>
            </div>
          </div>
          <BarChart data={activity} ariaLabel={useWeekly ? 'Tracked time per week' : 'Tracked time per day'} />
        </section>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <section className="card" aria-labelledby="cat-head">
          <div className="card-head">
            <div>
              <h2 className="card-title" id="cat-head">
                Time by category
              </h2>
              <p className="card-sub">{categories.length} categor{categories.length === 1 ? 'y' : 'ies'}</p>
            </div>
          </div>
          {categories.length ? (
            <>
              <ShareBar data={categories} total={total} />
              <RankedBars data={categories} total={total} limit={6} />
            </>
          ) : (
            <p className="muted small">No sessions in this range.</p>
          )}
        </section>

        <section className="card" aria-labelledby="task-head">
          <div className="card-head">
            <div>
              <h2 className="card-title" id="task-head">
                Time by task
              </h2>
              <p className="card-sub">Top tasks and session labels</p>
            </div>
          </div>
          {perTask.length ? <RankedBars data={perTask} total={total} limit={7} colored={false} /> : <p className="muted small">No sessions in this range.</p>}
        </section>
      </div>

      <section className="card" aria-labelledby="weekly-head">
        <div className="card-head">
          <div>
            <h2 className="card-title" id="weekly-head">
              Weekly trend
            </h2>
            <p className="card-sub">
              This week {formatDuration(thisWeek)} · last week {formatDuration(lastWeek)}
              {lastWeek > 0 && ` · ${thisWeek >= lastWeek ? '+' : ''}${Math.round(((thisWeek - lastWeek) / lastWeek) * 100)}%`}
            </p>
          </div>
        </div>
        <BarChart data={weeks} height={170} ariaLabel="Tracked time over the last 8 weeks" />
      </section>
    </div>
  );
}
