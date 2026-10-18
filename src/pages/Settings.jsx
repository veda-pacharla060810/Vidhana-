import { useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { useStore } from '../state/store.jsx';
import { useUI } from '../state/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { parseImport } from '../lib/validation.js';
import { SCHEMA_VERSION } from '../lib/schema.js';
import { todayKey } from '../lib/dates.js';

function Segmented({ label, value, options, onChange }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function NumberSetting({ id, label, value, min, max, suffix, onCommit }) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState('');
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setDraft(String(value));
  }
  const commit = () => {
    const n = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(n) || n < min || n > max) {
      setError(`Enter a number from ${min} to ${max}.`);
      return;
    }
    setError('');
    if (Math.round(n) !== value) onCommit(Math.round(n));
    setDraft(String(Math.round(n)));
  };
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-with-action">
        <input
          id={id}
          type="number"
          className={`input ${error ? 'input-error' : ''}`}
          style={{ maxWidth: 120 }}
          min={min}
          max={max}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError('');
          }}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
        <span className="muted small">{suffix}</span>
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export default function Settings() {
  const { state, actions, storageOk } = useStore();
  const { confirm } = useUI();
  const toast = useToast();
  const { settings } = state;
  const fileRef = useRef(null);
  const [newCat, setNewCat] = useState('');
  const [catError, setCatError] = useState('');

  const update = (patch, message = 'Settings saved') => {
    actions.updateSettings(patch);
    toast.show(message);
  };

  const addCategory = (e) => {
    e.preventDefault();
    const name = newCat.trim();
    if (!name) return setCatError('Type a category name.');
    if (name.length > 40) return setCatError('Keep it under 40 characters.');
    if (settings.categories.some((c) => c.toLowerCase() === name.toLowerCase())) return setCatError('That category already exists.');
    if (settings.categories.length >= 30) return setCatError('You can have up to 30 categories.');
    actions.updateSettings({ categories: [...settings.categories, name] });
    setNewCat('');
    setCatError('');
    toast.show(`Added “${name}”`);
  };

  const removeCategory = async (name) => {
    if (settings.categories.length <= 1) {
      toast.show('Keep at least one category.', { tone: 'warning' });
      return;
    }
    const ok = await confirm({
      title: `Remove “${name}”?`,
      message: 'Existing tasks and sessions keep this label. It just won’t be offered for new ones.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    actions.updateSettings({ categories: settings.categories.filter((c) => c !== name) });
    toast.show(`Removed “${name}”`);
  };

  const exportData = () => {
    try {
      const payload = {
        app: 'VEXA',
        version: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        tasks: state.tasks,
        sessions: state.sessions,
        settings: state.settings,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vexa-export-${todayKey()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.show(`Exported ${state.tasks.length} tasks and ${state.sessions.length} sessions`);
    } catch (err) {
      console.error('VEXA: export failed', err);
      toast.show('Export failed. Your browser may be blocking downloads.', { tone: 'error' });
    }
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.show('That file is too large to be a VEXA export.', { tone: 'error' });
      return;
    }
    let parsed;
    try {
      parsed = parseImport(await file.text());
    } catch (err) {
      toast.show(`Import failed: ${err.message}`, { tone: 'error', duration: 7000 });
      return;
    }
    const { data, dropped } = parsed;
    const ok = await confirm({
      title: 'Replace your data with this file?',
      message: `The file contains ${data.tasks.length} task${data.tasks.length === 1 ? '' : 's'} and ${data.sessions.length} session${data.sessions.length === 1 ? '' : 's'}${dropped ? ` (${dropped} damaged item${dropped === 1 ? '' : 's'} will be skipped)` : ''}. Everything currently in VEXA will be replaced${state.activeSession ? ', including the running timer' : ''}. Export first if you want a backup.`,
      confirmLabel: 'Replace data',
      danger: true,
    });
    if (!ok) return;
    actions.replaceAll({ ...data, activeSession: null });
    toast.show('Import complete');
  };

  const clearAll = async () => {
    const ok = await confirm({
      title: 'Delete all VEXA data?',
      message: `This permanently removes ${state.tasks.length} task${state.tasks.length === 1 ? '' : 's'}, ${state.sessions.length} session${state.sessions.length === 1 ? '' : 's'} and your settings from this browser. This cannot be undone.`,
      confirmLabel: 'Delete everything',
      danger: true,
    });
    if (!ok) return;
    actions.clearAll();
    toast.show('All local data deleted', { tone: 'warning' });
  };

  return (
    <div>
      <header className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Changes save automatically to this browser.</p>
        </div>
      </header>

      <section className="card">
        <div className="settings-section">
          <div>
            <h2>Appearance</h2>
            <p>Theme and time display.</p>
          </div>
          <div className="settings-body">
            <div className="field">
              <span className="label">Theme</span>
              <Segmented
                label="Theme"
                value={settings.theme}
                onChange={(v) => update({ theme: v }, 'Theme updated')}
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </div>
            <div className="field">
              <span className="label">Time format</span>
              <Segmented
                label="Time format"
                value={settings.timeFormat}
                onChange={(v) => update({ timeFormat: v }, 'Time format updated')}
                options={[
                  { value: '12h', label: '12-hour (2:30 PM)' },
                  { value: '24h', label: '24-hour (14:30)' },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div>
            <h2>Focus</h2>
            <p>Your daily goal and what new sessions start with.</p>
          </div>
          <div className="settings-body">
            <NumberSetting
              id="goal"
              label="Daily focus goal"
              value={settings.dailyGoalMinutes}
              min={0}
              max={1440}
              suffix="minutes per day (0 turns the goal off)"
              onCommit={(n) => update({ dailyGoalMinutes: n }, 'Daily goal updated')}
            />
            <div className="field">
              <span className="label">Default timer</span>
              <Segmented
                label="Default timer"
                value={settings.defaultTimerMode}
                onChange={(v) => update({ defaultTimerMode: v }, 'Default timer updated')}
                options={[
                  { value: 'stopwatch', label: 'Stopwatch' },
                  { value: 'countdown', label: 'Countdown' },
                ]}
              />
            </div>
            <NumberSetting
              id="countdown"
              label="Default countdown length"
              value={settings.defaultCountdownMinutes}
              min={1}
              max={600}
              suffix="minutes"
              onCommit={(n) => update({ defaultCountdownMinutes: n }, 'Countdown length updated')}
            />
            <div className="field">
              <label htmlFor="default-cat">Default session category</label>
              <select
                id="default-cat"
                className="input"
                style={{ maxWidth: 260 }}
                value={settings.defaultCategory}
                onChange={(e) => update({ defaultCategory: e.target.value }, 'Default category updated')}
              >
                <option value="">None</option>
                {settings.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div>
            <h2>Categories</h2>
            <p>Used for tasks and focus sessions.</p>
          </div>
          <div className="settings-body">
            <ul className="category-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {settings.categories.map((c) => (
                <li key={c} className="chip">
                  {c}
                  <button type="button" className="icon-btn" aria-label={`Remove category ${c}`} onClick={() => removeCategory(c)}>
                    <Icon name="x" size={12} />
                  </button>
                </li>
              ))}
            </ul>
            <form className="input-with-action" onSubmit={addCategory} noValidate>
              <label htmlFor="new-cat" className="sr-only">
                New category
              </label>
              <input
                id="new-cat"
                className={`input ${catError ? 'input-error' : ''}`}
                style={{ maxWidth: 260 }}
                placeholder="New category"
                value={newCat}
                maxLength={40}
                onChange={(e) => {
                  setNewCat(e.target.value);
                  setCatError('');
                }}
              />
              <button type="submit" className="btn btn-secondary">
                Add
              </button>
            </form>
            {catError && <p className="field-error">{catError}</p>}
          </div>
        </div>

        <div className="settings-section">
          <div>
            <h2>Your data</h2>
            <p>Back up, move, or remove what VEXA has stored.</p>
          </div>
          <div className="settings-body">
            <div className="setting-row">
              <div>
                <strong>Export</strong>
                <p className="muted small">Download your tasks, sessions and settings as a JSON file.</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={exportData}>
                <Icon name="download" size={16} /> Export JSON
              </button>
            </div>
            <div className="setting-row">
              <div>
                <strong>Import</strong>
                <p className="muted small">Restore a file previously exported from VEXA. This replaces current data.</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
                <Icon name="upload" size={16} /> Import JSON
              </button>
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
            </div>
            <div className="setting-row">
              <div>
                <strong>Clear all data</strong>
                <p className="muted small">Delete every task, session and setting from this browser.</p>
              </div>
              <button type="button" className="btn btn-danger-outline" onClick={clearAll}>
                <Icon name="trash" size={16} /> Clear data
              </button>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div>
            <h2>Privacy</h2>
            <p>How VEXA handles your information.</p>
          </div>
          <div className="settings-body">
            <div className="privacy-box">
              <p>
                <strong>
                  VEXA stores your tasks and session history locally in this browser. There are no user accounts or cloud synchronization. Clearing browser
                  storage or using another browser may remove or separate your data.
                </strong>
              </p>
              <p>
                Nothing you enter is sent to a server. VEXA has no analytics or tracking scripts, and it never monitors your apps, tabs or device activity — it only
                records the sessions you start and stop yourself.
              </p>
              <p>
                Browser storage is not encrypted. Anyone who can use this browser profile can open VEXA and see your data, so avoid storing anything sensitive.
              </p>
              {!storageOk && <p style={{ color: 'var(--warning)' }}>Storage is currently blocked in this browser, so data will not persist.</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
