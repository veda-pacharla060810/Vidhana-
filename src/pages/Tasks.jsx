import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import TaskItem from '../components/TaskItem.jsx';
import QuickAdd from '../components/QuickAdd.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useStore } from '../state/store.jsx';
import { useUI } from '../state/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { useToday } from '../state/hooks.js';
import { filterTasks, sortTasks, todaysTasks } from '../lib/stats.js';
import { PRIORITIES, PRIORITY_LABEL } from '../lib/schema.js';

const VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
];

const EMPTY_COPY = {
  all: ['No tasks yet', 'Add your first task with the box above or the New task button.'],
  today: ['Nothing due today', 'Tasks due today or overdue, and tasks you finish today, appear here.'],
  upcoming: ['No upcoming tasks', 'Tasks with a due date after today appear here.'],
  pending: ['No pending tasks', 'Everything is done. Nice work.'],
  completed: ['No completed tasks', 'Tick a task off and it will show up here.'],
};

export default function Tasks() {
  const { state, actions } = useStore();
  const { openTaskForm, confirm } = useUI();
  const toast = useToast();
  const today = useToday();
  const [view, setView] = useState('all');
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('smart');

  const { tasks, settings } = state;
  const usedCategories = useMemo(() => {
    const set = new Set(settings.categories);
    tasks.forEach((t) => t.category && set.add(t.category));
    return [...set];
  }, [tasks, settings.categories]);

  const filtered = sortTasks(filterTasks(tasks, { view, priority, category, query }, today), sort);
  const filtersActive = query.trim() || priority !== 'all' || category !== 'all';
  const counts = {
    all: tasks.length,
    today: todaysTasks(tasks, today).length,
    upcoming: tasks.filter((t) => !t.completed && t.dueDate && t.dueDate > today).length,
    pending: tasks.filter((t) => !t.completed).length,
    completed: tasks.filter((t) => t.completed).length,
  };

  const pendingList = filtered.filter((t) => !t.completed);
  const doneList = filtered.filter((t) => t.completed);
  const grouped = view === 'all' && sort === 'smart';

  const clearCompleted = async () => {
    const done = tasks.filter((t) => t.completed);
    const ok = await confirm({
      title: `Delete ${done.length} completed task${done.length === 1 ? '' : 's'}?`,
      message: 'Their focus sessions stay in your history. This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    done.forEach((t) => actions.deleteTask(t.id));
    toast.show(`Deleted ${done.length} completed task${done.length === 1 ? '' : 's'}`);
  };

  const resetFilters = () => {
    setQuery('');
    setPriority('all');
    setCategory('all');
  };

  return (
    <div>
      <header className="page-head">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-sub">
            {counts.pending} pending · {counts.completed} completed
          </p>
        </div>
        <div className="head-actions">
          {counts.completed > 0 && (
            <button type="button" className="btn btn-ghost" onClick={clearCompleted}>
              <Icon name="trash" size={16} /> Clear completed
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={() => openTaskForm({ defaults: view === 'today' ? { dueDate: today } : {} })}>
            <Icon name="plus" size={16} /> New task
          </button>
        </div>
      </header>

      <section className="card">
        <div className="segmented" role="group" aria-label="Task view" style={{ marginBottom: 16 }}>
          {VIEWS.map((v) => (
            <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)}>
              {v.label} <span className="muted num">{counts[v.id]}</span>
            </button>
          ))}
        </div>

        <div className="toolbar">
          <div className="search">
            <Icon name="search" size={16} />
            <label htmlFor="task-search" className="sr-only">
              Search tasks
            </label>
            <input
              id="task-search"
              type="search"
              className="input"
              placeholder="Search titles and notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="toolbar-filters">
            <label className="sr-only" htmlFor="f-priority">
              Filter by priority
            </label>
            <select id="f-priority" className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="all">Any priority</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]} priority
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="f-category">
              Filter by category
            </label>
            <select id="f-category" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">Any category</option>
              <option value="__none">No category</option>
              {usedCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="f-sort">
              Sort tasks
            </label>
            <select id="f-sort" className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="smart">Sort: Smart</option>
              <option value="due">Sort: Due date</option>
              <option value="priority">Sort: Priority</option>
              <option value="newest">Sort: Newest</option>
              <option value="title">Sort: A–Z</option>
            </select>
          </div>
        </div>

        <QuickAdd
          dueDate={view === 'today' ? today : null}
          placeholder={view === 'today' ? 'Add a task due today' : 'Quick add a task'}
          id="tasks-quick-add"
        />

        <div style={{ marginTop: 14 }}>
          {filtersActive && (
            <p className="result-count">
              {filtered.length} result{filtered.length === 1 ? '' : 's'} ·{' '}
              <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
                Clear filters
              </button>
            </p>
          )}

          {filtered.length === 0 ? (
            filtersActive ? (
              <EmptyState icon="search" title="No matching tasks">
                Try a different search or clear the filters.
              </EmptyState>
            ) : (
              <EmptyState icon="tasks" title={EMPTY_COPY[view][0]}>
                {EMPTY_COPY[view][1]}
              </EmptyState>
            )
          ) : grouped ? (
            <>
              {pendingList.length > 0 && (
                <>
                  <h3 className="task-group-title">Pending · {pendingList.length}</h3>
                  <ul className="task-list">
                    {pendingList.map((t) => (
                      <TaskItem key={t.id} task={t} />
                    ))}
                  </ul>
                </>
              )}
              {doneList.length > 0 && (
                <>
                  <h3 className="task-group-title">Completed · {doneList.length}</h3>
                  <ul className="task-list">
                    {doneList.map((t) => (
                      <TaskItem key={t.id} task={t} />
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <ul className="task-list">
              {filtered.map((t) => (
                <TaskItem key={t.id} task={t} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
