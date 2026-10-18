// localStorage access. Data never leaves the browser.

import { emptyData, normalizeData } from './schema.js';

export const STORAGE_KEY = 'vexa-data';

function storageAvailable() {
  try {
    const k = '__vexa_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

// Returns { data, notice } — notice is a user-facing message when something
// had to be recovered, otherwise null.
export function loadData() {
  if (!storageAvailable()) {
    return {
      data: emptyData(),
      notice: 'Browser storage is unavailable (private mode or blocked). Changes will be lost when you close this tab.',
      storageOk: false,
    };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { data: emptyData(), notice: null, storageOk: true };
  try {
    const { data, dropped } = normalizeData(JSON.parse(raw));
    return {
      data,
      notice: dropped > 0 ? `${dropped} damaged item${dropped === 1 ? ' was' : 's were'} skipped while loading your data.` : null,
      storageOk: true,
    };
  } catch (err) {
    // Keep the unreadable copy so nothing is silently destroyed.
    const backupKey = `${STORAGE_KEY}-unreadable-${Date.now()}`;
    try {
      window.localStorage.setItem(backupKey, raw);
    } catch (backupErr) {
      console.error('VEXA: could not back up unreadable data', backupErr);
    }
    console.error('VEXA: stored data could not be read', err);
    return {
      data: emptyData(),
      notice: `Your saved data could not be read, so VEXA started fresh. The original was kept in browser storage as "${backupKey}".`,
      storageOk: true,
    };
  }
}

// Returns null on success or an error message.
export function saveData(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return null;
  } catch (err) {
    console.error('VEXA: save failed', err);
    if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
      return 'Browser storage is full. Export your data and remove old sessions to keep saving.';
    }
    return 'Your latest change could not be saved to browser storage.';
  }
}

export function clearData() {
  window.localStorage.removeItem(STORAGE_KEY);
}
