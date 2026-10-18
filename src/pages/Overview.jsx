import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import TaskItem from '../components/TaskItem.jsx';
import QuickAdd from '../components/QuickAdd.jsx';
import FocusTimer from '../components/FocusTimer.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { RankedBars, ShareBar } from '../components/Charts.jsx';
import { useStore } from '../state/store.jsx';
import { useNow, useToday } from '../state/hooks.js';
import { byCategory, dayStats, recapSentence, sortTasks, todaysTasks } from '../lib/stats.js';
import { formatDuration, formatLongDate, greeting } from '../lib/dates.js';
import { elapsedMs, isRunning } from '../lib/timer.js';

function Stat({ label, icon, value, foot, progress }) {
  return (
    <div className="stat">
      <div className="stat-label">
        <Icon name={icon} size={14} />
        {label}
      </div>
      <div className="stat-value">{value}</div>
      {progress !== undefined && progress !== null && (
        <div className="progress" aria-hidden="true">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  );
}

export default function Overview() {
  const { state } = useStore();
  const today = useToday();
  const { tasks, sessions, settings, activeSession } = state;
  const now = useNow(isRunning(activeSession), 1000);
  // Re-render the greeting on the minute even when idle.
  useNow(true, 60_000);

  const stats = dayStats(tasks, sessions, today);
  const agenda = sortTasks(todaysTasks(tasks, today), 'smart');
  const liveMs = activeSession ? elapsedMs(activeSession, now) : 0;
  const goalMs = settings.dailyGoalMinutes * 60000;
  const categories = byCategory(stats.sessions);
  const sentence = recapSentence(stats);
  const isNew = tasks.length === 0 && sessions.length === 0;

  return (
    <div>
      <header className="page-head">
        <div>
          <p className="eyebrow">{formatLongDate(new Date())}</p>
          <h1 className="page-title">{greeting(new Date(now))}</h1>
          <p className="page-sub">
            {isNew
              ? 'Add a task or start a focus session to begin.'
              : stats.pending.length > 0
                ? `${stats.pending.length} task${stats.pending.length === 1 ? '' : 's'} left for today.`
                : stats.completed.length > 0
                  ? 'Everything due today is done.'
                  : 'Nothing is due today.'}
          </p>
        </div>
        <div className="head-actions">
          <Link to="/recap" className="btn btn-secondary">
            <Icon name="recap" size={16} /> Daily recap
          </Link>
        </div>
      </header>

      <section className="stats" aria-label="Today at a glance">
        <Stat
          label="Completed today"
          icon="check"
          value={stats.completed.length}
          progress={stats.taskProgress}
          foot={stats.taskProgress !== null ? `${Math.round(stats.taskProgress * 100)}% of today's tasks` : 'No tasks due today'}
        />
        <Stat label="Remaining" icon="flag" value={stats.pending.length} foot={stats.pending.length ? 'Due today or overdue' : 'All clear'} />
        <Stat
          label="Tracked today"
          icon="clock"
          value={formatDuration(stats.trackedMs)}
          progress={goalMs > 0 ? Math.min(1, stats.trackedMs / goalMs) : null}
          foot={
            goalMs > 0
              ? `Goal ${formatDuration(goalMs)}${liveMs > 0 ? ` · +${formatDuration(liveMs)} in progress` : ''}`
              : liveMs > 0
                ? `+${formatDuration(liveMs)} in progress`
                : 'No daily goal set'
          }
        />
        <Stat
          label="Focus sessions"
          icon="focus"
          value={stats.sessionCount}
          foot={stats.sessionCount ? `Avg ${formatDuration(stats.trackedMs / stats.sessionCount)}` : 'None yet today'}
        />
      </section>

      <div className="grid grid-dash">
        <section className="card" aria-labelledby="today-tasks">
          <div className="card-head">
            <div>
              <h2 className="card-title" id="today-tasks">
                Today's tasks
              </h2>
              <p className="card-sub">Due today, overdue, and finished today</p>
            </div>
            <Link to="/tasks" className="btn btn-ghost btn-sm">
              All tasks <Icon name="chevronRight" size={14} />
            </Link>
          </div>
          <QuickAdd dueDate={today} placeholder="Add a task for today and press Enter" id="dash-quick-add" />
          {agenda.length > 0 ? (
            <ul className="task-list" style={{ marginTop: 10 }}>
              {agenda.map((t) => (
                <TaskItem key={t.id} task={t} compact />
              ))}
            </ul>
          ) : (
            <EmptyState icon="tasks" title={tasks.length ? 'Nothing due today' : 'No tasks yet'}>
              {tasks.length
                ? 'Tasks due today and overdue tasks will show up here. Use the box above to add one for today.'
                : 'Type a task above and press Enter. It will be due today.'}
            </EmptyState>
          )}
        </section>

        <div className="stack">
          <section className="card" aria-labelledby="dash-focus">
            <div className="card-head">
              <h2 className="card-title" id="dash-focus">
                Focus timer
              </h2>
              <Link to="/focus" className="btn btn-ghost btn-sm">
                Sessions <Icon name="chevronRight" size={14} />
              </Link>
            </div>
            <FocusTimer compact />
          </section>

          <section className="card" aria-labelledby="dash-summary">
            <div className="card-head">
              <h2 className="card-title" id="dash-summary">
                Daily summary
              </h2>
              <Link to="/recap" className="btn btn-ghost btn-sm">
                Recap <Icon name="chevronRight" size={14} />
              </Link>
            </div>
            {stats.sessionCount === 0 && stats.completed.length === 0 ? (
              <EmptyState icon="insights" title="No activity recorded today">
                Finish a focus session or complete a task and your summary for today will appear here.
              </EmptyState>
            ) : (
              <>
                {sentence && <p className="recap-sentence">{sentence}</p>}
                {categories.length > 0 && (
                  <div style={{ marginTop: 18 }}>
                    <ShareBar data={categories} total={stats.trackedMs} />
                    <RankedBars data={categories} total={stats.trackedMs} limit={4} />
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
