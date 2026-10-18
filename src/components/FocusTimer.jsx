import { useState } from 'react';
import Icon from './Icon.jsx';
import Modal from './Modal.jsx';
import { useStore } from '../state/store.jsx';
import { useUI } from '../state/ui.jsx';
import { useToast } from './Toast.jsx';
import { useNow } from '../state/hooks.js';
import { elapsedMs, isRunning, LONG_SESSION_MS, MIN_SESSION_MS } from '../lib/timer.js';
import { formatClock, formatDuration, formatTimer } from '../lib/dates.js';

function StartForm({ compact }) {
  const { state, actions } = useStore();
  const toast = useToast();
  const { settings, tasks } = state;
  const openTasks = tasks.filter((t) => !t.completed);
  const [taskId, setTaskId] = useState('');
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState(settings.defaultCategory);
  const [mode, setMode] = useState(settings.defaultTimerMode);
  const [minutes, setMinutes] = useState(String(settings.defaultCountdownMinutes));
  const [error, setError] = useState('');

  const pickTask = (id) => {
    setTaskId(id);
    const t = tasks.find((x) => x.id === id);
    if (t?.category) setCategory(t.category);
    setError('');
  };

  const start = (e) => {
    e.preventDefault();
    const task = tasks.find((t) => t.id === taskId);
    const name = task ? task.title : label.trim();
    if (!name) {
      setError('Choose a task or type what you are working on.');
      return;
    }
    let targetMs = null;
    if (mode === 'countdown') {
      const m = Number(minutes);
      if (!Number.isFinite(m) || m < 1 || m > 600) {
        setError('Countdown must be between 1 and 600 minutes.');
        return;
      }
      targetMs = Math.round(m) * 60000;
    }
    const ok = actions.startSession({ label: name, taskId: task?.id, category, targetMs });
    if (!ok) toast.show('A session is already running.', { tone: 'warning' });
  };

  const id = compact ? 'ft-c' : 'ft';

  return (
    <form className="form timer-start" onSubmit={start} noValidate>
      <div className="field">
        <label htmlFor={`${id}-task`}>Work on</label>
        <select id={`${id}-task`} className="input" value={taskId} onChange={(e) => pickTask(e.target.value)}>
          <option value="">Custom label…</option>
          {openTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>
      {!taskId && (
        <div className="field">
          <label htmlFor={`${id}-label`} className={compact ? 'sr-only' : ''}>
            Session label
          </label>
          <input
            id={`${id}-label`}
            className={`input ${error && !label.trim() ? 'input-error' : ''}`}
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setError('');
            }}
            placeholder="e.g. Read chapter 4"
            maxLength={200}
            autoComplete="off"
          />
        </div>
      )}
      <div className="field-row">
        <div className="field">
          <label htmlFor={`${id}-cat`}>Category</label>
          <select id={`${id}-cat`} className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">None</option>
            {settings.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-mode`}>Timer</label>
          <select id={`${id}-mode`} className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="stopwatch">Stopwatch</option>
            <option value="countdown">Countdown</option>
          </select>
        </div>
        {mode === 'countdown' && (
          <div className="field field-narrow">
            <label htmlFor={`${id}-min`}>Minutes</label>
            <input
              id={`${id}-min`}
              type="number"
              min="1"
              max="600"
              className="input"
              value={minutes}
              onChange={(e) => {
                setMinutes(e.target.value);
                setError('');
              }}
            />
          </div>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
      <button type="submit" className="btn btn-primary btn-block">
        <Icon name="play" size={14} /> Start session
      </button>
    </form>
  );
}

function FinishModal({ active, onCancel, onDone }) {
  const { state, actions } = useStore();
  const toast = useToast();
  const [notes, setNotes] = useState('');
  const elapsed = elapsedMs(active);
  const tooShort = elapsed < MIN_SESSION_MS;
  const tf = state.settings.timeFormat;

  const save = () => {
    const saved = actions.stopSession(notes);
    if (saved) toast.show(`Saved ${formatDuration(saved.durationMs)} on “${saved.label}”`);
    else toast.show('Session was under 5 seconds, so it was not saved.', { tone: 'warning' });
    onDone(saved);
  };

  return (
    <Modal
      open
      title="Finish session"
      onClose={onCancel}
      initialFocus="#finish-notes"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Keep going
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            {tooShort ? 'End without saving' : 'Save session'}
          </button>
        </>
      }
    >
      <dl className="summary-grid">
        <div>
          <dt>Session</dt>
          <dd>{active.label}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{active.category || 'None'}</dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd>{formatClock(active.startedAt, tf)}</dd>
        </div>
        <div>
          <dt>Focused time</dt>
          <dd className="num">{formatDuration(elapsed)}</dd>
        </div>
      </dl>
      {tooShort ? (
        <p className="muted small">Sessions shorter than 5 seconds are not saved.</p>
      ) : (
        <div className="field">
          <label htmlFor="finish-notes">
            Notes <span className="label-hint">optional</span>
          </label>
          <textarea
            id="finish-notes"
            className="input textarea"
            rows={3}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you get done?"
          />
        </div>
      )}
    </Modal>
  );
}

export default function FocusTimer({ compact = false, onSaved }) {
  const { state, actions } = useStore();
  const { confirm } = useUI();
  const toast = useToast();
  const active = state.activeSession;
  const running = isRunning(active);
  const now = useNow(running);
  const [finishing, setFinishing] = useState(null); // { wasRunning }

  if (!active) {
    return <StartForm compact={compact} />;
  }

  const elapsed = elapsedMs(active, now);
  const target = active.targetMs;
  const remaining = target ? target - elapsed : null;
  const overtime = target && remaining <= 0;
  const progress = target ? Math.min(1, elapsed / target) : null;
  const task = active.taskId ? state.tasks.find((t) => t.id === active.taskId) : null;

  const beginFinish = () => {
    setFinishing({ wasRunning: running });
    if (running) actions.pauseSession();
  };

  const cancelFinish = () => {
    if (finishing?.wasRunning) actions.resumeSession();
    setFinishing(null);
  };

  const discard = async () => {
    const ok = await confirm({
      title: 'Discard this session?',
      message: `${formatDuration(elapsed)} of tracked time will not be saved.`,
      confirmLabel: 'Discard',
      danger: true,
    });
    if (ok) {
      actions.discardSession();
      toast.show('Session discarded', { tone: 'warning' });
    }
  };

  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <div className={`timer ${compact ? 'timer-compact' : ''}`}>
      <div className="timer-status">
        <span className={`status-dot ${running ? 'status-live' : 'status-paused'}`} />
        {running ? 'In session' : 'Paused'}
        {active.category && <span className="timer-cat">· {active.category}</span>}
      </div>

      <div className="timer-face">
        {target ? (
          <svg className="timer-ring" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r={R} className="ring-track" />
            <circle
              cx="60"
              cy="60"
              r={R}
              className={`ring-fill ${overtime ? 'ring-done' : ''}`}
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
            />
          </svg>
        ) : null}
        <div className="timer-readout" role="timer" aria-live="off">
          <span className="timer-digits num">{target ? (overtime ? `+${formatTimer(-remaining)}` : formatTimer(remaining)) : formatTimer(elapsed)}</span>
          <span className="timer-sub">
            {target ? (overtime ? 'Target reached · overtime' : `of ${formatDuration(target)} · ${formatDuration(elapsed)} done`) : 'elapsed'}
          </span>
        </div>
      </div>

      <p className="timer-label" title={active.label}>
        {active.label}
        {task?.completed && <span className="muted small"> (task completed)</span>}
      </p>

      {elapsed > LONG_SESSION_MS && (
        <p className="notice notice-warning small">
          <Icon name="alert" size={14} /> This session has been running for over 8 hours. Did you forget to stop it?
        </p>
      )}

      <div className="timer-controls">
        {running ? (
          <button type="button" className="btn btn-secondary" onClick={actions.pauseSession}>
            <Icon name="pause" size={15} /> Pause
          </button>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={actions.resumeSession}>
            <Icon name="play" size={14} /> Resume
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={beginFinish}>
          <Icon name="stop" size={14} /> Stop
        </button>
        {!compact && (
          <button type="button" className="btn btn-ghost" onClick={discard}>
            Discard
          </button>
        )}
      </div>

      {finishing && (
        <FinishModal
          active={state.activeSession}
          onCancel={cancelFinish}
          onDone={(saved) => {
            setFinishing(null);
            onSaved?.(saved);
          }}
        />
      )}
    </div>
  );
}
