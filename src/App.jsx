import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/Toast.jsx';
import { StoreProvider, useStore } from './state/store.jsx';
import { UIProvider } from './state/ui.jsx';
import { useResolvedTheme } from './state/hooks.js';
import AppShell from './components/AppShell.jsx';
import Overview from './pages/Overview.jsx';
import Tasks from './pages/Tasks.jsx';
import Focus from './pages/Focus.jsx';
import CalendarPage from './pages/Calendar.jsx';
import Insights from './pages/Insights.jsx';
import Recap from './pages/Recap.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

function ThemeSync() {
  const { state } = useStore();
  const resolved = useResolvedTheme(state.settings.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#1c1718' : '#754B4D');
  }, [resolved]);
  return null;
}

// HashRouter keeps URLs like /#/tasks, so direct links and refreshes work on
// any static host (GitHub Pages, Netlify) without server redirect rules.
export default function App() {
  return (
    <ToastProvider>
      <StoreProvider>
        <ThemeSync />
        <HashRouter>
          <UIProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<Overview />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="focus" element={<Focus />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="insights" element={<Insights />} />
                <Route path="recap" element={<Recap />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </UIProvider>
        </HashRouter>
      </StoreProvider>
    </ToastProvider>
  );
}
