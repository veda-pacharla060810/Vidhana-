import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { loadData, saveData, STORAGE_KEY } from '../lib/storage.js';
import { emptyData, normalizeSettings } from '../lib/schema.js';
import { createId } from '../lib/id.js';
import { elapsedMs, MIN_SESSION_MS, pauseActive, resumeActive } from '../lib/timer.js';
import { useToast } from '../components/Toast.jsx';

const StoreContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'replace':
      return action.data;

    case 'task/add':
      return { ...state, tasks: [action.task, ...state.tasks] };

    case 'task/update':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, ...action.patch, updatedAt: new Date().toISOString() } : t)),
      };

    case 'task/toggle':
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== action.id) return t;
          const completed = !t.completed;
          const now = new Date().toISOString();
          return { ...t, completed, completedAt: completed ? now : null, updatedAt: now };
        }),
      };

    case 'task/delete': {
      const active = state.activeSession;
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.id),
        // keep the running timer, but detach it from the deleted task
        activeSession: active && active.taskId === action.id ? { ...active, taskId: null } : active,
      };
    }

    case 'session/start':
      if (state.activeSession) return state; // never run two timers
      return { ...state, activeSession: action.active };

    case 'session/pause':
      return { ...state, activeSession: pauseActive(state.activeSession, action.now) };

    case 'session/resume':
      return { ...state, activeSession: resumeActive(state.activeSession, action.now) };

    case 'session/discard':
      return { ...state, activeSession: null };

    case 'session/stop': {
      const active = state.activeSession;
      if (!active || active.id !== action.id) return state; // already stopped (e.g. double click)
      if (!action.session || state.sessions.some((s) => s.id === action.session.id)) {
        return { ...state, activeSession: null };
      }
      return { ...state, activeSession: null, sessions: [action.session, ...state.sessions] };
    }

    case 'session/add':
      return { ...state, sessions: [action.session, ...state.sessions] };

    case 'session/update':
      return { ...state, sessions: state.sessions.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)) };

    case 'session/delete':
      return { ...state, sessions: state.sessions.filter((s) => s.id !== action.id) };

    case 'settings/update':
      return { ...state, settings: normalizeSettings({ ...state.settings, ...action.patch }) };

    case 'clear':
      return emptyData();

    default:
      console.error('VEXA: unknown action', action.type);
      return state;
  }
}

export function StoreProvider({ children }) {
  const toast = useToast();
  const initial = useRef(null);
  if (initial.current === null) initial.current = loadData();
  const [state, dispatch] = useReducer(reducer, initial.current.data);
  const [storageOk] = useState(initial.current.storageOk);
  const stateRef = useRef(state);
  stateRef.current = state;
  const lastSaveError = useRef(null);

  // Show any recovery notice once on startup.
  useEffect(() => {
    if (initial.current.notice) toast.show(initial.current.notice, { tone: 'warning', duration: 9000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist every change.
  useEffect(() => {
    if (!storageOk) return;
    const err = saveData(state);
    if (err && err !== lastSaveError.current) toast.show(err, { tone: 'error', duration: 9000 });
    lastSaveError.current = err;
  }, [state, storageOk, toast]);

  // Keep multiple open tabs in sync (prevents duplicate timers/sessions).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      const { data } = loadData();
      dispatch({ type: 'replace', data });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const actions = useMemo(
    () => ({
      addTask(input) {
        const now = new Date().toISOString();
        const task = {
          id: createId('task'),
          title: input.title.trim(),
          notes: (input.notes || '').trim(),
          priority: input.priority || 'medium',
          category: input.category || '',
          dueDate: input.dueDate || null,
          completed: false,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        dispatch({ type: 'task/add', task });
        return task;
      },
      updateTask(id, patch) {
        const clean = { ...patch };
        if ('title' in clean) clean.title = clean.title.trim();
        if ('notes' in clean) clean.notes = (clean.notes || '').trim();
        if ('dueDate' in clean) clean.dueDate = clean.dueDate || null;
        dispatch({ type: 'task/update', id, patch: clean });
      },
      toggleTask(id) {
        dispatch({ type: 'task/toggle', id });
      },
      deleteTask(id) {
        dispatch({ type: 'task/delete', id });
      },
      restoreTask(task) {
        if (stateRef.current.tasks.some((t) => t.id === task.id)) return;
        dispatch({ type: 'task/add', task });
      },
      restoreSession(session) {
        if (stateRef.current.sessions.some((s) => s.id === session.id)) return;
        dispatch({ type: 'session/add', session });
      },
      startSession({ label, taskId, category, targetMs }) {
        if (stateRef.current.activeSession) return false;
        const now = Date.now();
        dispatch({
          type: 'session/start',
          active: {
            id: createId('session'),
            label: label.trim(),
            taskId: taskId || null,
            category: category || '',
            startedAt: now,
            accumulatedMs: 0,
            runningSince: now,
            targetMs: targetMs || null,
          },
        });
        return true;
      },
      pauseSession() {
        dispatch({ type: 'session/pause', now: Date.now() });
      },
      resumeSession() {
        dispatch({ type: 'session/resume', now: Date.now() });
      },
      discardSession() {
        dispatch({ type: 'session/discard' });
      },
      // Returns the saved session, or null if it was too short to keep.
      stopSession(notes = '') {
        const active = stateRef.current.activeSession;
        if (!active) return null;
        const now = Date.now();
        const durationMs = Math.min(elapsedMs(active, now), now - active.startedAt);
        const session =
          durationMs >= MIN_SESSION_MS
            ? {
                id: active.id,
                label: active.label,
                taskId: active.taskId,
                category: active.category,
                startedAt: new Date(active.startedAt).toISOString(),
                endedAt: new Date(now).toISOString(),
                durationMs: Math.round(durationMs),
                notes: notes.trim(),
                manual: false,
              }
            : null;
        dispatch({ type: 'session/stop', id: active.id, session });
        return session;
      },
      addManualSession({ label, taskId, category, startMs, durationMs, notes }) {
        const session = {
          id: createId('session'),
          label: label.trim(),
          taskId: taskId || null,
          category: category || '',
          startedAt: new Date(startMs).toISOString(),
          endedAt: new Date(startMs + durationMs).toISOString(),
          durationMs,
          notes: (notes || '').trim(),
          manual: true,
        };
        dispatch({ type: 'session/add', session });
        return session;
      },
      updateSession(id, patch) {
        dispatch({ type: 'session/update', id, patch });
      },
      deleteSession(id) {
        dispatch({ type: 'session/delete', id });
      },
      updateSettings(patch) {
        dispatch({ type: 'settings/update', patch });
      },
      replaceAll(data) {
        dispatch({ type: 'replace', data });
      },
      clearAll() {
        dispatch({ type: 'clear' });
      },
    }),
    []
  );

  const value = useMemo(() => ({ state, actions, storageOk }), [state, actions, storageOk]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
