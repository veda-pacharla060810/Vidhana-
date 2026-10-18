// Data schema, defaults and normalizers. Every piece of data that comes from
// localStorage or an imported file passes through these functions, so
// malformed or outdated records are repaired or dropped instead of crashing
// the app.

import { isValidDateKey } from './dates.js';

export const SCHEMA_VERSION = 1;

export const PRIORITIES = ['low', 'medium', 'high'];
export const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };
export const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

export const DEFAULT_CATEGORIES = ['Study', 'Work', 'Personal', 'Health'];

export const DEFAULT_SETTINGS = {
  theme: 'system', // 'system' | 'light' | 'dark'
  timeFormat: '12h', // '12h' | '24h'
  dailyGoalMinutes: 120,
  categories: DEFAULT_CATEGORIES,
  defaultCategory: 'Study',
  defaultTimerMode: 'stopwatch', // 'stopwatch' | 'countdown'
  defaultCountdownMinutes: 25,
};

export function emptyData() {
  return {
    version: SCHEMA_VERSION,
    tasks: [],
    sessions: [],
    settings: { ...DEFAULT_SETTINGS, categories: [...DEFAULT_CATEGORIES] },
    activeSession: null,
  };
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isIso = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const finiteNum = (v) => typeof v === 'number' && Number.isFinite(v);

export function normalizeTask(raw) {
  if (!isObj(raw)) return null;
  const title = str(raw.title, 200);
  const id = str(raw.id, 100);
  if (!title || !id) return null;
  const completed = raw.completed === true;
  const createdAt = isIso(raw.createdAt) ? raw.createdAt : new Date().toISOString();
  return {
    id,
    title,
    notes: str(raw.notes, 2000),
    priority: PRIORITIES.includes(raw.priority) ? raw.priority : 'medium',
    category: str(raw.category, 40),
    dueDate: isValidDateKey(raw.dueDate) ? raw.dueDate : null,
    completed,
    completedAt: completed ? (isIso(raw.completedAt) ? raw.completedAt : createdAt) : null,
    createdAt,
    updatedAt: isIso(raw.updatedAt) ? raw.updatedAt : createdAt,
  };
}

export function normalizeSession(raw) {
  if (!isObj(raw)) return null;
  const id = str(raw.id, 100);
  if (!id || !isIso(raw.startedAt) || !isIso(raw.endedAt)) return null;
  if (!finiteNum(raw.durationMs) || raw.durationMs <= 0) return null;
  const start = Date.parse(raw.startedAt);
  const end = Date.parse(raw.endedAt);
  if (end < start) return null;
  // Active duration can never exceed the wall-clock span of the session.
  const durationMs = Math.min(Math.round(raw.durationMs), end - start);
  if (durationMs <= 0) return null;
  return {
    id,
    label: str(raw.label, 200) || 'Untitled session',
    taskId: str(raw.taskId, 100) || null,
    category: str(raw.category, 40),
    startedAt: raw.startedAt,
    endedAt: raw.endedAt,
    durationMs,
    notes: str(raw.notes, 2000),
    manual: raw.manual === true,
  };
}

// The in-progress timer. Elapsed time is always derived from timestamps:
//   elapsed = accumulatedMs + (runningSince ? now - runningSince : 0)
export function normalizeActiveSession(raw) {
  if (!isObj(raw)) return null;
  const id = str(raw.id, 100);
  if (!id || !finiteNum(raw.startedAt) || !finiteNum(raw.accumulatedMs)) return null;
  if (raw.runningSince !== null && !finiteNum(raw.runningSince)) return null;
  const now = Date.now();
  // A start time in the future means a broken clock or corrupt data.
  if (raw.startedAt > now + 60_000 || (raw.runningSince && raw.runningSince > now + 60_000)) return null;
  return {
    id,
    label: str(raw.label, 200) || 'Focus session',
    taskId: str(raw.taskId, 100) || null,
    category: str(raw.category, 40),
    startedAt: raw.startedAt,
    accumulatedMs: Math.max(0, raw.accumulatedMs),
    runningSince: raw.runningSince ?? null,
    targetMs: finiteNum(raw.targetMs) && raw.targetMs > 0 ? raw.targetMs : null,
  };
}

export function normalizeSettings(raw) {
  const s = isObj(raw) ? raw : {};
  let categories = Array.isArray(s.categories)
    ? [...new Set(s.categories.map((c) => str(c, 40)).filter(Boolean))].slice(0, 30)
    : [...DEFAULT_CATEGORIES];
  if (categories.length === 0) categories = [...DEFAULT_CATEGORIES];
  const goal = Number(s.dailyGoalMinutes);
  const countdown = Number(s.defaultCountdownMinutes);
  return {
    theme: ['system', 'light', 'dark'].includes(s.theme) ? s.theme : DEFAULT_SETTINGS.theme,
    timeFormat: s.timeFormat === '24h' ? '24h' : '12h',
    dailyGoalMinutes: Number.isFinite(goal) && goal >= 0 && goal <= 1440 ? Math.round(goal) : DEFAULT_SETTINGS.dailyGoalMinutes,
    categories,
    defaultCategory: categories.includes(s.defaultCategory) ? s.defaultCategory : '',
    defaultTimerMode: s.defaultTimerMode === 'countdown' ? 'countdown' : 'stopwatch',
    defaultCountdownMinutes:
      Number.isFinite(countdown) && countdown >= 1 && countdown <= 600 ? Math.round(countdown) : DEFAULT_SETTINGS.defaultCountdownMinutes,
  };
}

// Normalizes a whole data object. Returns { data, dropped } where dropped is
// the number of records that could not be repaired.
export function normalizeData(raw) {
  if (!isObj(raw)) throw new Error('Data is not a VEXA data object.');
  let dropped = 0;
  const dedupe = (items, normalize) => {
    const seen = new Set();
    const out = [];
    for (const item of Array.isArray(items) ? items : []) {
      const n = normalize(item);
      if (!n || seen.has(n.id)) {
        dropped++;
        continue;
      }
      seen.add(n.id);
      out.push(n);
    }
    return out;
  };
  const tasks = dedupe(raw.tasks, normalizeTask);
  const sessions = dedupe(raw.sessions, normalizeSession);
  let activeSession = raw.activeSession ? normalizeActiveSession(raw.activeSession) : null;
  if (raw.activeSession && !activeSession) dropped++;
  // If an active session was already saved (e.g. stopped in another tab), drop it.
  if (activeSession && sessions.some((s) => s.id === activeSession.id)) activeSession = null;
  return {
    data: {
      version: SCHEMA_VERSION,
      tasks,
      sessions,
      settings: normalizeSettings(raw.settings),
      activeSession,
    },
    dropped,
  };
}
