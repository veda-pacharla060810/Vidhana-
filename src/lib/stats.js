// Pure calculations over real task and session records. Nothing here
// invents data: every number comes from what the user has saved.

import { addDays, endOfDayMs, toDateKey, todayKey, weekStartKey, fromDateKey } from './dates.js';
import { PRIORITY_RANK } from './schema.js';

export const sessionDay = (s) => toDateKey(new Date(s.startedAt));
export const completedDay = (t) => (t.completedAt ? toDateKey(new Date(t.completedAt)) : null);

export function sumDuration(sessions) {
  return sessions.reduce((acc, s) => acc + s.durationMs, 0);
}

export function sessionsOn(sessions, day) {
  return sessions.filter((s) => sessionDay(s) === day);
}

// Tasks that belong on a day's agenda: incomplete & due on/before the day,
// or completed on that day.
export function todaysTasks(tasks, day = todayKey()) {
  return tasks.filter((t) => {
    if (t.completed) return completedDay(t) === day;
    return t.dueDate && t.dueDate <= day;
  });
}

export function dayStats(tasks, sessions, day = todayKey()) {
  const daySessions = sessionsOn(sessions, day);
  const completed = tasks.filter((t) => t.completed && completedDay(t) === day);
  const isToday = day === todayKey();
  const dayEnd = endOfDayMs(day);
  // Pending for a day = due on/before it, created by then, and not completed by its end.
  const pending = tasks.filter((t) => {
    if (!t.dueDate || t.dueDate > day) return false;
    if (Date.parse(t.createdAt) > dayEnd) return false;
    if (!t.completed) return true;
    return !isToday && Date.parse(t.completedAt) > dayEnd;
  });
  const trackedMs = sumDuration(daySessions);
  const total = completed.length + pending.length;
  return {
    completed,
    pending,
    sessions: daySessions,
    trackedMs,
    sessionCount: daySessions.length,
    taskProgress: total > 0 ? completed.length / total : null,
  };
}

export function groupDuration(sessions, keyFn) {
  const map = new Map();
  for (const s of sessions) {
    const k = keyFn(s);
    map.set(k, (map.get(k) || 0) + s.durationMs);
  }
  return [...map.entries()].map(([label, ms]) => ({ label, ms })).sort((a, b) => b.ms - a.ms);
}

export function byCategory(sessions) {
  return groupDuration(sessions, (s) => s.category || 'Uncategorized');
}

export function byTask(sessions, tasks) {
  const titles = new Map(tasks.map((t) => [t.id, t.title]));
  return groupDuration(sessions, (s) => (s.taskId && titles.get(s.taskId)) || s.label);
}

export function dailySeries(sessions, fromKey, toKey) {
  const totals = new Map();
  for (const s of sessions) {
    const d = sessionDay(s);
    totals.set(d, (totals.get(d) || 0) + s.durationMs);
  }
  const out = [];
  for (let k = fromKey; k <= toKey; k = addDays(k, 1)) out.push({ key: k, ms: totals.get(k) || 0 });
  return out;
}

export function weeklySeries(sessions, weeks, endKey = todayKey()) {
  const lastStart = weekStartKey(endKey);
  const totals = new Map();
  for (const s of sessions) {
    const w = weekStartKey(sessionDay(s));
    totals.set(w, (totals.get(w) || 0) + s.durationMs);
  }
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const k = addDays(lastStart, -7 * i);
    out.push({ key: k, ms: totals.get(k) || 0 });
  }
  return out;
}

export function recapSentence(stats) {
  const parts = [];
  const total = stats.completed.length + stats.pending.length;
  if (total > 0) parts.push(`You completed ${stats.completed.length} of ${total} task${total === 1 ? '' : 's'}`);
  else if (stats.completed.length > 0) parts.push(`You completed ${stats.completed.length} task${stats.completed.length === 1 ? '' : 's'}`);
  if (stats.sessionCount > 0) {
    const mins = Math.round(stats.trackedMs / 60000);
    const time = mins >= 1 ? `${mins} minute${mins === 1 ? '' : 's'}` : 'less than a minute';
    parts.push(`tracked ${time} across ${stats.sessionCount} focus session${stats.sessionCount === 1 ? '' : 's'}`);
  }
  if (parts.length === 0) return null;
  const sentence = parts.join(' and ');
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

// Task list filtering/sorting
export function filterTasks(tasks, { view = 'all', priority = 'all', category = 'all', query = '' }, today = todayKey()) {
  const q = query.trim().toLowerCase();
  return tasks.filter((t) => {
    if (view === 'today' && !todaysTasks([t], today).length) return false;
    if (view === 'upcoming' && (t.completed || !t.dueDate || t.dueDate <= today)) return false;
    if (view === 'pending' && t.completed) return false;
    if (view === 'completed' && !t.completed) return false;
    if (priority !== 'all' && t.priority !== priority) return false;
    if (category !== 'all' && (t.category || '') !== (category === '__none' ? '' : category)) return false;
    if (q && !t.title.toLowerCase().includes(q) && !t.notes.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function sortTasks(tasks, sort = 'smart') {
  const list = [...tasks];
  const due = (t) => t.dueDate || '9999-12-31';
  const cmp = {
    smart: (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      due(a).localeCompare(due(b)) ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      b.createdAt.localeCompare(a.createdAt),
    due: (a, b) => due(a).localeCompare(due(b)) || b.createdAt.localeCompare(a.createdAt),
    priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || due(a).localeCompare(due(b)),
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    title: (a, b) => a.title.localeCompare(b.title),
  }[sort];
  return cmp ? list.sort(cmp) : list;
}

export function firstSessionDay(sessions) {
  if (!sessions.length) return null;
  return sessions.reduce((min, s) => (sessionDay(s) < min ? sessionDay(s) : min), sessionDay(sessions[0]));
}

export function daysBetween(a, b) {
  return Math.round((fromDateKey(b) - fromDateKey(a)) / 86400000);
}
