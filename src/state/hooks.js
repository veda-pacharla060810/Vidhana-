import { useEffect, useState } from 'react';
import { todayKey } from '../lib/dates.js';

// Re-renders on an interval while `active` is true. The interval only
// triggers re-renders; displayed values are always computed from timestamps.
export function useNow(active, intervalMs = 500) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!active) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    const onVisible = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [active, intervalMs]);
  return now;
}

// The current local date key, updated when the day rolls over.
export function useToday() {
  const [key, setKey] = useState(todayKey);
  useEffect(() => {
    const id = window.setInterval(() => {
      const k = todayKey();
      setKey((prev) => (prev === k ? prev : k));
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);
  return key;
}

export function useResolvedTheme(theme) {
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
}
