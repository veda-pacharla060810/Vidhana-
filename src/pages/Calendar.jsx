import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import TaskItem from '../components/TaskItem.jsx';
import QuickAdd from '../components/QuickAdd.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useStore } from '../state/store.jsx';
import { useUI } from '../state/ui.jsx';
import { useToday } from '../state/hooks.js';
import { addDays, formatLongDate, formatWeekday, fromDateKey, monthGrid, relativeDueLabel } from '../lib/dates.js';
import { sortTasks } from '../lib/stats.js';
import { PRIORITY_LABEL } from '../lib/schema.js';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const { state } = useStore();
  const { openTaskForm } = useUI();
  const today = useToday();
  const [cursor, setCursor] = useState(() => {
    const d = fromDateKey(today);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);

  const byDate = new Map();
  for (const t of state.tasks) {
    if (!t.dueDate) continue;
    if (!byDate.has(t.dueDate)) byDate.set(t.dueDate, []);
    byDate.get(t.dueDate).push(t);
  }
  for (const list of byDate.values()) list.splice(0, list.length, ...sortTasks(list, 'smart'));

  const cells = monthGrid(cursor.y, cursor.m);
  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const selectedTasks = byDate.get(selected) || [];

  const shiftMonth = (delta) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const goToday = () => {
    const d = fromDateKey(today);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(today);
  };

  const horizon = addDays(today, 14);
  const overdue = state.tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < today);
  const upcoming = sortTasks(
    state.tasks.filter((t) => !t.completed && t.dueDate && t.dueDate >= today && t.dueDate <= horizon),
    'due'
  );

  // Arrow-key movement across the grid.
  const onGridKey = (e) => {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = addDays(selected, moves[e.key]);
    setSelected(next);
    const d = fromDateKey(next);
    if (d.getMonth() !== cursor.m || d.getFullYear() !== cursor.y) setCursor({ y: d.getFullYear(), m: d.getMonth() });
    window.requestAnimationFrame(() => document.querySelector(`[data-date="${next}"]`)?.focus());
  };

  return (
    <div>
      <header className="page-head">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-sub">Your tasks on their due dates. Select a day to see or add tasks.</p>
        </div>
      </header>

      <div className="grid grid-dash">
        <section className="card" aria-label="Month calendar">
          <div className="cal-head">
            <h2 className="cal-title">{monthLabel}</h2>
            <div className="cal-nav">
              <button type="button" className="btn btn-ghost btn-sm" onClick={goToday}>
                Today
              </button>
              <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
                <Icon name="chevronLeft" />
              </button>
              <button type="button" className="icon-btn" aria-label="Next month" onClick={() => shiftMonth(1)}>
                <Icon name="chevronRight" />
              </button>
            </div>
          </div>
          <div className="cal-grid" role="grid" aria-label={monthLabel} onKeyDown={onGridKey}>
            {DOW.map((d) => (
              <div key={d} className="cal-dow" role="columnheader">
                {d}
              </div>
            ))}
            {cells.map((c) => {
              const list = byDate.get(c.key) || [];
              const pending = list.filter((t) => !t.completed).length;
              const classes = ['cal-cell', !c.inMonth && 'cal-out', c.key === today && 'cal-today', c.key === selected && 'cal-selected']
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={c.key}
                  type="button"
                  role="gridcell"
                  data-date={c.key}
                  className={classes}
                  onClick={() => setSelected(c.key)}
                  tabIndex={c.key === selected ? 0 : -1}
                  aria-selected={c.key === selected}
                  aria-label={`${formatLongDate(c.key)}${list.length ? `, ${list.length} task${list.length === 1 ? '' : 's'}${pending ? `, ${pending} pending` : ''}` : ''}`}
                >
                  <span className="cal-day">{c.day}</span>
                  {list.slice(0, 2).map((t) => (
                    <span key={t.id} className={`cal-chip ${t.completed ? 'cal-chip-done' : ''} ${t.priority === 'high' && !t.completed ? 'cal-chip-high' : ''}`}>
                      {t.title}
                    </span>
                  ))}
                  {list.length > 2 && <span className="cal-more">+{list.length - 2} more</span>}
                  {list.length > 0 && (
                    <span className="cal-dots" aria-hidden="true">
                      {list.slice(0, 3).map((t) => (
                        <span key={t.id} className={t.completed ? 'done' : ''} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="cal-legend">
            <span>Use arrow keys to move between days.</span>
          </p>
        </section>

        <div className="stack">
          <section className="card" aria-labelledby="day-head">
            <div className="card-head">
              <div>
                <h2 className="card-title" id="day-head">
                  {['Today', 'Tomorrow', 'Yesterday'].includes(relativeDueLabel(selected, today))
                    ? relativeDueLabel(selected, today)
                    : formatWeekday(selected, 'long')}
                </h2>
                <p className="card-sub">{formatLongDate(selected)}</p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => openTaskForm({ defaults: { dueDate: selected } })}>
                <Icon name="plus" size={14} /> Task
              </button>
            </div>
            <QuickAdd key={selected} dueDate={selected} placeholder="Add a task for this day" id="cal-quick-add" />
            {selectedTasks.length ? (
              <ul className="task-list" style={{ marginTop: 10 }}>
                {selectedTasks.map((t) => (
                  <TaskItem key={t.id} task={t} compact />
                ))}
              </ul>
            ) : (
              <EmptyState icon="calendar" title="No tasks due this day">
                Add one above and it will appear on the calendar.
              </EmptyState>
            )}
          </section>

          <section className="card" aria-labelledby="upcoming-head">
            <div className="card-head">
              <div>
                <h2 className="card-title" id="upcoming-head">
                  Upcoming deadlines
                </h2>
                <p className="card-sub">Next 14 days{overdue.length ? ` · ${overdue.length} overdue` : ''}</p>
              </div>
            </div>
            {upcoming.length ? (
              <ul className="upcoming">
                {upcoming.map((t) => {
                  const d = fromDateKey(t.dueDate);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="date-tile"
                        style={{ border: 'none' }}
                        onClick={() => {
                          setSelected(t.dueDate);
                          setCursor({ y: d.getFullYear(), m: d.getMonth() });
                        }}
                        aria-label={`Show ${formatLongDate(t.dueDate)} on the calendar`}
                      >
                        <b>{d.getDate()}</b>
                        <small>{d.toLocaleDateString(undefined, { month: 'short' })}</small>
                      </button>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="truncate" style={{ fontWeight: 500 }}>
                          {t.title}
                        </div>
                        <div className="muted small">
                          {relativeDueLabel(t.dueDate, today)} · {PRIORITY_LABEL[t.priority]}
                          {t.category ? ` · ${t.category}` : ''}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon="flag" title="No deadlines in the next two weeks">
                Give tasks a due date to see them here.
              </EmptyState>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
