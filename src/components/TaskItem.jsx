import Icon from './Icon.jsx';
import { useStore } from '../state/store.jsx';
import { useUI } from '../state/ui.jsx';
import { useToast } from './Toast.jsx';
import { PRIORITY_LABEL } from '../lib/schema.js';
import { relativeDueLabel } from '../lib/dates.js';
import { useToday } from '../state/hooks.js';

export default function TaskItem({ task, compact = false }) {
  const { actions } = useStore();
  const { openTaskForm } = useUI();
  const toast = useToast();
  const today = useToday();
  const overdue = !task.completed && task.dueDate && task.dueDate < today;

  const remove = () => {
    actions.deleteTask(task.id);
    toast.show(`Deleted “${task.title}”`, {
      tone: 'success',
      duration: 6000,
      action: { label: 'Undo', onClick: () => actions.restoreTask(task) },
    });
  };

  return (
    <li className={`task ${task.completed ? 'task-done' : ''} ${compact ? 'task-compact' : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        className="task-check"
        onClick={() => actions.toggleTask(task.id)}
        aria-label={task.completed ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
      >
        <Icon name="check" size={13} strokeWidth={2.6} />
      </button>
      <div className="task-main">
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          <span className={`badge badge-${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
          {task.dueDate && (
            <span className={`meta-item ${overdue ? 'meta-overdue' : ''}`}>
              <Icon name="calendar" size={13} />
              {overdue ? `Overdue · ${relativeDueLabel(task.dueDate, today)}` : relativeDueLabel(task.dueDate, today)}
            </span>
          )}
          {task.category && (
            <span className="meta-item">
              <Icon name="tag" size={13} />
              {task.category}
            </span>
          )}
          {!compact && task.notes && <span className="meta-item meta-notes">{task.notes}</span>}
        </span>
      </div>
      <div className="task-actions">
        <button type="button" className="icon-btn" aria-label={`Edit “${task.title}”`} title="Edit" onClick={() => openTaskForm({ task })}>
          <Icon name="edit" size={16} />
        </button>
        <button type="button" className="icon-btn icon-btn-danger" aria-label={`Delete “${task.title}”`} title="Delete" onClick={remove}>
          <Icon name="trash" size={16} />
        </button>
      </div>
    </li>
  );
}
