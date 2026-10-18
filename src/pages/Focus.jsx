import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import FocusTimer from '../components/FocusTimer.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { useStore } from '../state/store.jsx';
import { useToast } from '../components/Toast.jsx';
import { useToday } from '../state/hooks.js';
import { addDays, formatClock, formatDuration, formatLongDate, formatShortDate, timeInputValue } from '../lib/dates.js';
import { sessionDay, sumDuration } from '../lib/stats.js';
import { validateManualSession } from '../lib/validation.js';

function SessionEditModal({ session, onClose }) {
  const { state, actions } = useStore();
  const toast = useToast();
  const [label, setLabel] = useState(session.label);
  const [category, setCategory] = useState(session.category);
  const [notes, setNotes] = useState(session.notes);
  const [error, setError] = useState('');
  const cats = session.category && !state.settings.categories.includes(session.category) ? [...state.settings.categories, session.category] : state.settings.categories;

  const save = (e) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('The session needs a label.');
      return;
    }
    actions.updateSession(session.id, { label: label.trim().slice(0, 200), category, notes: notes.trim().slice(0, 2000) });
    toast.show('Session updated');
    onClose();
  };

  return (
    <Modal
      open
      title="Edit session"
      description={`${formatLongDate(sessionDay(session))} · ${formatDuration(session.durationMs)}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="session-edit" className="btn btn-primary">
            Save
          </button>
        </>
      }
    >
      <form id="session-edit" className="form" onSubmit={save} noValidate>
        <div className="field">
          <label htmlFor="se-label">Label</label>
          <input
            id="se-label"
            className={`input ${error ? 'input-error' : ''}`}
            value={label}
            maxLength={200}
            onChange={(e) => {
              setLabel(e.target.value);
              setError('');
            }}
          />
          {error && <p className="field-error">{error}</p>}
        </div>
        <div className="field">
          <label htmlFor="se-cat">Category</label>
          <select id="se-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">None</option>
            {cats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="se-notes">Notes</label>
          <textarea id="se-notes" className="input textarea" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </form>
    </Modal>
  );
}

function ManualSessionForm() {
  const { state, actions } = useStore();
  const toast = useToast();
  const today = useToday();
  const openTasks = state.tasks.filter((t) => !t.completed);
  const blank = () => ({
    taskId: '',
    label: '',
    category: state.settings.defaultCategory,
    date: today,
    start: timeInputValue(Date.now() - 60 * 60000),
    minutes: '30',
    notes: '',
  });
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const task = state.tasks.find((t) => t.id === form.taskId);

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'taskId') {
        const t = state.tasks.find((x) => x.id === v);
        if (t?.category) next.category = t.category;
      }
      return next;
    });
    setErrors((er) => ({ ...er, [k]: undefined, ...(k === 'taskId' ? { label: undefined } : {}) }));
  };

  const submit = (e) => {
    e.preventDefault();
    const label = task ? task.title : form.label;
    const errs = validateManualSession({ ...form, label });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const [y, mo, d] = form.date.split('-').map(Number);
    const [h, mi] = form.start.split(':').map(Number);
    const startMs = new Date(y, mo - 1, d, h, mi).getTime();
    const saved = actions.addManualSession({
      label,
      taskId: task?.id,
      category: form.category,
      startMs,
      durationMs: Math.round(Number(form.minutes)) * 60000,
      notes: form.notes,
    });
    toast.show(`Logged ${formatDuration(saved.durationMs)} on “${saved.label}”`);
    setForm(blank());
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="ms-task">Task</label>
        <select id="ms-task" className="input" value={form.taskId} onChange={set('taskId')}>
          <option value="">Custom label…</option>
          {openTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>
      {!form.taskId && (
        <div className="field">
          <label htmlFor="ms-label">Label</label>
          <input id="ms-label" className={`input ${errors.label ? 'input-error' : ''}`} value={form.label} onChange={set('label')} maxLength={200} placeholder="What did you work on?" />
          {errors.label && <p className="field-error">{errors.label}</p>}
        </div>
      )}
      <div className="field-row">
        <div className="field">
          <label htmlFor="ms-date">Date</label>
          <input id="ms-date" type="date" max={today} className={`input ${errors.date ? 'input-error' : ''}`} value={form.date} onChange={set('date')} />
        </div>
        <div className="field">
          <label htmlFor="ms-start">Start</label>
          <input id="ms-start" type="time" className={`input ${errors.start ? 'input-error' : ''}`} value={form.start} onChange={set('start')} />
        </div>
        <div className="field field-narrow">
          <label htmlFor="ms-min">Minutes</label>
          <input id="ms-min" type="number" min="1" max="960" className={`input ${errors.minutes ? 'input-error' : ''}`} value={form.minutes} onChange={set('minutes')} />
        </div>
      </div>
      {(errors.date || errors.start || errors.minutes) && <p className="field-error">{errors.date || errors.start || errors.minutes}</p>}
      <div className="field">
        <label htmlFor="ms-cat">Category</label>
        <select id="ms-cat" className="input" value={form.category} onChange={set('category')}>
          <option value="">None</option>
          {state.settings.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn btn-secondary">
        <Icon name="plus" size={15} /> Log session
      </button>
    </form>
  );
}

const PAGE_DAYS = 14;

export default function Focus() {
  const { state, actions } = useStore();
  const toast = useToast();
  const today = useToday();
  const [lastSaved, setLastSaved] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [daysShown, setDaysShown] = useState(PAGE_DAYS);
  const { sessions, settings } = state;
  const tf = settings.timeFormat;

  const sorted = [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const byDay = new Map();
  for (const s of sorted) {
    const d = sessionDay(s);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(s);
  }
  const days = [...byDay.keys()];
  const visibleDays = days.slice(0, daysShown);

  const remove = (s) => {
    actions.deleteSession(s.id);
    toast.show(`Deleted session “${s.label}”`, {
      duration: 6000,
      action: { label: 'Undo', onClick: () => actions.restoreSession(s) },
    });
  };

  const dayLabel = (d) => (d === today ? 'Today' : d === addDays(today, -1) ? 'Yesterday' : formatShortDate(d));

  return (
    <div>
      <header className="page-head">
        <div>
          <h1 className="page-title">Focus Sessions</h1>
          <p className="page-sub">Start a timer when you begin, stop it when you finish. VEXA only records what you track here.</p>
        </div>
      </header>

      <div className="grid grid-dash">
        <div className="stack">
          <section className="card" aria-label="Focus timer">
            <FocusTimer onSaved={(s) => s && setLastSaved(s)} />
          </section>

          {lastSaved && (
            <section className="card" aria-labelledby="last-session">
              <div className="card-head">
                <h2 className="card-title" id="last-session">
                  Session saved
                </h2>
                <button type="button" className="icon-btn" aria-label="Dismiss summary" onClick={() => setLastSaved(null)}>
                  <Icon name="x" size={16} />
                </button>
              </div>
              <dl className="summary-grid">
                <div>
                  <dt>Session</dt>
                  <dd>{lastSaved.label}</dd>
                </div>
                <div>
                  <dt>Focused time</dt>
                  <dd className="num">{formatDuration(lastSaved.durationMs)}</dd>
                </div>
                <div>
                  <dt>Time</dt>
                  <dd className="num">
                    {formatClock(Date.parse(lastSaved.startedAt), tf)} – {formatClock(Date.parse(lastSaved.endedAt), tf)}
                  </dd>
                </div>
                <div>
                  <dt>Today so far</dt>
                  <dd className="num">{formatDuration(sumDuration(byDay.get(today) || []))}</dd>
                </div>
              </dl>
            </section>
          )}

          <section className="card" aria-labelledby="manual-head">
            <div className="card-head" style={{ marginBottom: showManual ? 16 : 0 }}>
              <div>
                <h2 className="card-title" id="manual-head">
                  Log a past session
                </h2>
                <p className="card-sub">Forgot to start the timer? Add the time by hand.</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" aria-expanded={showManual} onClick={() => setShowManual((v) => !v)}>
                {showManual ? 'Hide' : 'Add'}
              </button>
            </div>
            {showManual && <ManualSessionForm />}
          </section>
        </div>

        <section className="card" aria-labelledby="history-head">
          <div className="card-head">
            <div>
              <h2 className="card-title" id="history-head">
                Session history
              </h2>
              <p className="card-sub">
                {sessions.length} session{sessions.length === 1 ? '' : 's'} · {formatDuration(sumDuration(sessions))} total
              </p>
            </div>
          </div>
          {sessions.length === 0 ? (
            <EmptyState icon="history" title="No sessions yet">
              Pick a task or type a label, then press Start session. When you stop, the session is saved here.
            </EmptyState>
          ) : (
            <>
              {visibleDays.map((d) => {
                const list = byDay.get(d);
                return (
                  <div key={d}>
                    <h3 className="day-heading">
                      <span>{dayLabel(d)}</span>
                      <span className="num">{formatDuration(sumDuration(list))}</span>
                    </h3>
                    <ul className="session-list">
                      {list.map((s) => (
                        <li key={s.id} className="session-row">
                          <span className="session-time">{formatClock(Date.parse(s.startedAt), tf)}</span>
                          <div className="session-main">
                            <div className="session-title">{s.label}</div>
                            <div className="session-meta">
                              {s.category && <span>{s.category}</span>}
                              <span>
                                until {formatClock(Date.parse(s.endedAt), tf)}
                              </span>
                              {s.manual && <span>logged manually</span>}
                            </div>
                            {s.notes && <p className="session-notes">{s.notes}</p>}
                          </div>
                          <span className="session-dur">{formatDuration(s.durationMs)}</span>
                          <button type="button" className="icon-btn" aria-label={`Edit session “${s.label}”`} title="Edit" onClick={() => setEditing(s)}>
                            <Icon name="edit" size={16} />
                          </button>
                          <button type="button" className="icon-btn icon-btn-danger" aria-label={`Delete session “${s.label}”`} title="Delete" onClick={() => remove(s)}>
                            <Icon name="trash" size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {days.length > daysShown && (
                <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 16 }} onClick={() => setDaysShown((n) => n + PAGE_DAYS)}>
                  Show older sessions
                </button>
              )}
            </>
          )}
        </section>
      </div>

      {editing && <SessionEditModal session={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
