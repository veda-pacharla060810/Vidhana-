import { useState } from 'react';
import Icon from './Icon.jsx';
import { useStore } from '../state/store.jsx';
import { useToast } from './Toast.jsx';

// One-line task creation. `dueDate` presets the date (e.g. today on the dashboard).
export default function QuickAdd({ dueDate = null, placeholder = 'Add a task and press Enter', id = 'quick-add' }) {
  const { actions } = useStore();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      setError('Type a task title first.');
      return;
    }
    if (t.length > 200) {
      setError('Keep the title under 200 characters.');
      return;
    }
    actions.addTask({ title: t, dueDate });
    setTitle('');
    setError('');
    toast.show('Task added');
  };

  return (
    <form className="quick-add" onSubmit={submit} noValidate>
      <label htmlFor={id} className="sr-only">
        New task title
      </label>
      <div className={`quick-add-row ${error ? 'quick-add-error' : ''}`}>
        <Icon name="plus" size={16} />
        <input
          id={id}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError('');
          }}
          placeholder={placeholder}
          maxLength={200}
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button type="submit" className="btn btn-primary btn-sm">
          Add
        </button>
      </div>
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </form>
  );
}
