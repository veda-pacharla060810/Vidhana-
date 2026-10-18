import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { RankedBars, ShareBar } from '../components/Charts.jsx';
import { useStore } from '../state/store.jsx';
import { useToday } from '../state/hooks.js';
import { addDays, formatClock, formatDuration, formatLongDate, isValidDateKey } from '../lib/dates.js';
import { byCategory, dayStats, recapSentence } from '../lib/stats.js';
import { PRIORITY_LABEL } from '../lib/schema.js';

export default function Recap() {
  const { state } = useStore();
  const today = useToday();
  const [day, setDay] = useState(today);
  const stats = dayStats(state.tasks, state.sessions, day);
  const categories = byCategory(stats.sessions);
  const sentence = recapSentence(stats);
  const tf = state.settings.timeFormat;
  const isToday = day === today;
  const hasActivity = stats.sessionCount > 0 || stats.completed.length > 0 || stats.pending.length > 0;

  return (
    <div>
      <Link to="/" className="back-link">
        <Icon name="arrowLeft" size={15} /> Overview
      </Link>
      <header className="page-head">
        <div>
          <p className="eyebrow">Daily recap</p>
          <h1 className="page-title">{isToday ? 'Today' : day === addDays(today, -1) ? 'Yesterday' : formatLongDate(day)}</h1>
          {(isToday || day === addDays(today, -1)) && <p className="page-sub">{formatLongDate(day)}</p>}
        </div>
        <div className="cal-nav">
          <button type="button" className="icon-btn" aria-label="Previous day" onClick={() => setDay((d) => addDays(d, -1))}>
            <Icon name="chevronLeft" />
          </button>
          <label htmlFor="recap-date" className="sr-only">
            Choose a day
          </label>
          <input
            id="recap-date"
            type="date"
            className="input"
            style={{ width: 'auto' }}
            max={today}
            value={day}
            onChange={(e) => isValidDateKey(e.target.value) && e.target.value <= today && setDay(e.target.value)}
          />
          <button type="button" className="icon-btn" aria-label="Next day" disabled={isToday} onClick={() => setDay((d) => (d < today ? addDays(d, 1) : d))}>
            <Icon name="chevronRight" />
          </button>
          {!isToday && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDay(today)}>
              Today
            </button>
          )}
        </div>
      </header>

      {!hasActivity ? (
        <section className="card">
          <EmptyState icon="recap" title={isToday ? 'Nothing recorded yet today' : 'Nothing recorded on this day'}>
            {isToday
              ? 'Complete tasks or track a focus session, and your recap will fill in automatically.'
              : 'There are no completed tasks, due tasks, or focus sessions saved for this day.'}
          </EmptyState>
        </section>
      ) : (
        <>
          {sentence && (
            <p className="recap-sentence" style={{ marginBottom: 20 }}>
              {sentence}
            </p>
          )}

          <section className="stats" aria-label="Day totals">
            <div className="stat">
              <div className="stat-label">Tasks completed</div>
              <div className="stat-value">{stats.completed.length}</div>
            </div>
            <div className="stat">
              <div className="stat-label">{isToday ? 'Still pending' : 'Left unfinished'}</div>
              <div className="stat-value">{stats.pending.length}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Tracked time</div>
              <div className="stat-value">{formatDuration(stats.trackedMs)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Focus sessions</div>
              <div className="stat-value">{stats.sessionCount}</div>
            </div>
          </section>

          <div className="grid grid-2">
            <section className="card" aria-labelledby="recap-cat">
              <h2 className="card-title" id="recap-cat" style={{ marginBottom: 16 }}>
                Time by category
              </h2>
              {categories.length ? (
                <>
                  <ShareBar data={categories} total={stats.trackedMs} />
                  <RankedBars data={categories} total={stats.trackedMs} />
                </>
              ) : (
                <p className="muted small">No focus sessions on this day.</p>
              )}
            </section>

            <section className="card" aria-labelledby="recap-sessions">
              <h2 className="card-title" id="recap-sessions" style={{ marginBottom: 8 }}>
                Sessions
              </h2>
              {stats.sessions.length ? (
                <ul className="session-list">
                  {[...stats.sessions]
                    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
                    .map((s) => (
                      <li key={s.id} className="session-row">
                        <span className="session-time">{formatClock(Date.parse(s.startedAt), tf)}</span>
                        <div className="session-main">
                          <div className="session-title">{s.label}</div>
                          {s.category && <div className="session-meta">{s.category}</div>}
                        </div>
                        <span className="session-dur">{formatDuration(s.durationMs)}</span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="muted small">No focus sessions on this day.</p>
              )}
            </section>

            <section className="card" aria-labelledby="recap-done">
              <h2 className="card-title" id="recap-done" style={{ marginBottom: 8 }}>
                Completed
              </h2>
              {stats.completed.length ? (
                <ul className="kv">
                  {stats.completed.map((t) => (
                    <li key={t.id} className="kv-row">
                      <span className="truncate">
                        <Icon name="check" size={13} /> {t.title}
                      </span>
                      <span className="muted small">{formatClock(Date.parse(t.completedAt), tf)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">No tasks completed on this day.</p>
              )}
            </section>

            <section className="card" aria-labelledby="recap-pending">
              <h2 className="card-title" id="recap-pending" style={{ marginBottom: 8 }}>
                {isToday ? 'Still pending' : 'Left unfinished'}
              </h2>
              {stats.pending.length ? (
                <ul className="kv">
                  {stats.pending.map((t) => (
                    <li key={t.id} className="kv-row">
                      <span className="truncate">{t.title}</span>
                      <span className="muted small">{PRIORITY_LABEL[t.priority]}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">Nothing due was left unfinished.</p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
