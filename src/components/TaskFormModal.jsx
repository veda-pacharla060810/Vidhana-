import { useState } from 'react';
import Modal from './Modal.jsx';
import { useStore } from '../state/store.jsx';
import { useToast } from './Toast.jsx';
import { validateTaskInput } from '../lib/validation.js';
import { PRIORITIES, PRIORITY_LABEL } from '../lib/schema.js';

export default function TaskFormModal({ task, defaults = {}, onClose }) {
  const { state, actions } = useStore();
  const toast = useToast();
  const editing = Boolean(task);
  const [form, setForm] = useState(() => ({
    title: task?.title ?? defaults.title ?? '',
    notes: task?.notes ?? '',
    priority: task?.priority ?? defaults.priority ?? 'medium',
    category: task?.category ?? defaults.category ?? '',
    dueDate: task?.dueDate ?? defaults.dueDate ?? '',
  }));
  const [errors, setErrors] = useState({});
  const categories = state.settings.categories;
  // Keep a category that was removed from settings selectable for this task.
  const categoryOptions = form.category && !categories.includes(form.category) ? [...categories, form.category] : categories;

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validateTaskInput(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (editing) {
      actions.updateTask(task.id, form);
      toast.show('Task updated');
    } else {
      actions.addTask(form);
      toast.show('Task added');
    }
    onClose();
  };

  return (
    <Modal
      open
      title={editing ? 'Edit task' : 'New task'}
      onClose={onClose}
      initialFocus="#task-title"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="task-form" className="btn btn-primary">
            {editing ? 'Save changes' : 'Add task'}
          </button>
        </>
      }
    >
      <form id="task-form" className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="task-title">Title</label>
          <input
            id="task-title"
            className={`input ${errors.title ? 'input-error' : ''}`}
            value={form.title}
            onChange={set('title')}
            placeholder="e.g. Finish chemistry worksheet"
            maxLength={200}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'task-title-error' : undefined}
            autoComplete="off"
          />
          {errors.title && (
            <p className="field-error" id="task-title-error">
              {errors.title}
            </p>
          )}
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="task-priority">Priority</label>
            <select id="task-priority" className="input" value={form.priority} onChange={set('priority')}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="task-category">Category</label>
            <select id="task-category" className="input" value={form.category} onChange={set('category')}>
              <option value="">None</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="task-due">
            Due date <span className="label-hint">optional</span>
          </label>
          <div className="input-with-action">
            <input
              id="task-due"
              type="date"
              className={`input ${errors.dueDate ? 'input-error' : ''}`}
              value={form.dueDate}
              onChange={set('dueDate')}
              aria-invalid={Boolean(errors.dueDate)}
            />
            {form.dueDate && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm((f) => ({ ...f, dueDate: '' }))}>
                Clear
              </button>
            )}
          </div>
          {errors.dueDate && <p className="field-error">{errors.dueDate}</p>}
        </div>

        <div className="field">
          <label htmlFor="task-notes">
            Notes <span className="label-hint">optional</span>
          </label>
          <textarea
            id="task-notes"
            className={`input textarea ${errors.notes ? 'input-error' : ''}`}
            value={form.notes}
            onChange={set('notes')}
            rows={3}
            maxLength={2000}
            placeholder="Details, links, or the first step"
          />
          {errors.notes && <p className="field-error">{errors.notes}</p>}
        </div>
      </form>
    </Modal>
  );
}
