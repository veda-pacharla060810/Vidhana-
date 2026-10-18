import { isValidDateKey } from './dates.js';
import { PRIORITIES, normalizeData } from './schema.js';

// Returns an object of field -> message. Empty object means valid.
export function validateTaskInput(input) {
  const errors = {};
  const title = (input.title || '').trim();
  if (!title) errors.title = 'Give the task a title.';
  else if (title.length > 200) errors.title = 'Keep the title under 200 characters.';
  if (!PRIORITIES.includes(input.priority)) errors.priority = 'Choose a priority.';
  if (input.dueDate && !isValidDateKey(input.dueDate)) errors.dueDate = 'Enter a valid date.';
  if ((input.notes || '').length > 2000) errors.notes = 'Keep notes under 2000 characters.';
  return errors;
}

export function validateManualSession({ label, date, start, minutes }) {
  const errors = {};
  if (!(label || '').trim()) errors.label = 'Add a label or choose a task.';
  if (!isValidDateKey(date)) errors.date = 'Enter a valid date.';
  if (!/^\d{2}:\d{2}$/.test(start || '')) errors.start = 'Enter a start time.';
  const m = Number(minutes);
  if (!Number.isFinite(m) || m < 1 || m > 960) errors.minutes = 'Enter between 1 and 960 minutes.';
  if (!errors.date && !errors.start && !errors.minutes) {
    const [h, mi] = start.split(':').map(Number);
    const [y, mo, d] = date.split('-').map(Number);
    const startMs = new Date(y, mo - 1, d, h, mi).getTime();
    if (startMs + m * 60000 > Date.now()) errors.start = 'A logged session must end before now.';
  }
  return errors;
}

// Parses an exported VEXA file. Returns { data, dropped } or throws with a
// user-facing message.
export function parseImport(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (!raw || typeof raw !== 'object' || raw.app !== 'VEXA') {
    throw new Error('This file does not look like a VEXA export.');
  }
  if (typeof raw.version !== 'number' || raw.version > 1) {
    throw new Error('This export was made by a newer version of VEXA.');
  }
  if (!Array.isArray(raw.tasks) || !Array.isArray(raw.sessions)) {
    throw new Error('The export is missing its tasks or sessions.');
  }
  return normalizeData(raw);
}
