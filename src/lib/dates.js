// Date helpers. All calendar dates (due dates, "day" buckets) use the
// browser's LOCAL time zone and are stored as "YYYY-MM-DD" strings, so a
// task due on the 5th stays on the 5th regardless of UTC offsets.

const pad = (n) => String(n).padStart(2, '0');

export function toDateKey(input = new Date()) {
  const d = input instanceof Date ? input : new Date(input);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isValidDateKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = fromDateKey(key);
  return toDateKey(d) === key;
}

export function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

export function todayKey() {
  return toDateKey(new Date());
}

export function startOfDayMs(key) {
  return fromDateKey(key).getTime();
}

export function endOfDayMs(key) {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + 1);
  return d.getTime() - 1;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Good evening';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatLongDate(input = new Date()) {
  const d = typeof input === 'string' ? fromDateKey(input) : input;
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(key) {
  const d = fromDateKey(key);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

export function formatWeekday(key, style = 'short') {
  return fromDateKey(key).toLocaleDateString(undefined, { weekday: style });
}

export function relativeDueLabel(key, today = todayKey()) {
  if (!key) return '';
  if (key === today) return 'Today';
  if (key === addDays(today, 1)) return 'Tomorrow';
  if (key === addDays(today, -1)) return 'Yesterday';
  return formatShortDate(key);
}

export function formatClock(ms, timeFormat = '12h') {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  });
}

// "1h 25m", "45m", "30s"
export function formatDuration(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return totalSec > 0 ? `${totalSec}s` : '0m';
}

// "01:05:09" or "05:09"
export function formatTimer(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Month grid (6 rows x 7 cols) of date keys, weeks starting Sunday.
export function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({ key: toDateKey(d), inMonth: d.getMonth() === month, day: d.getDate() });
  }
  return cells;
}

// Sunday-based week start key for a date key
export function weekStartKey(key) {
  const d = fromDateKey(key);
  d.setDate(d.getDate() - d.getDay());
  return toDateKey(d);
}

export function timeInputValue(ms) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
