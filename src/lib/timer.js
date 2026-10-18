// Timestamp-based timer math. Nothing here counts interval ticks, so the
// value is correct after re-renders, background tabs, sleep, or a refresh.

export function elapsedMs(active, now = Date.now()) {
  if (!active) return 0;
  const running = active.runningSince ? Math.max(0, now - active.runningSince) : 0;
  return active.accumulatedMs + running;
}

export function isRunning(active) {
  return Boolean(active && active.runningSince);
}

export function pauseActive(active, now = Date.now()) {
  if (!active || !active.runningSince) return active;
  return { ...active, accumulatedMs: elapsedMs(active, now), runningSince: null };
}

export function resumeActive(active, now = Date.now()) {
  if (!active || active.runningSince) return active;
  return { ...active, runningSince: now };
}

// Sessions shorter than this are discarded on stop rather than saved.
export const MIN_SESSION_MS = 5_000;

// Sessions running longer than this are flagged as possibly forgotten.
export const LONG_SESSION_MS = 8 * 60 * 60 * 1000;
