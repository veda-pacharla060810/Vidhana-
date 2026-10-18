import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Modal from '../components/Modal.jsx';
import TaskFormModal from '../components/TaskFormModal.jsx';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [taskForm, setTaskForm] = useState(null); // { task?, defaults? }
  const [confirmState, setConfirmState] = useState(null);
  const resolver = useRef(null);

  const openTaskForm = useCallback((opts = {}) => setTaskForm(opts), []);
  const closeTaskForm = useCallback(() => setTaskForm(null), []);

  // Promise-based confirm: `if (await confirm({...})) { ... }`
  const confirm = useCallback((opts) => {
    setConfirmState(opts);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value) => {
    resolver.current?.(value);
    resolver.current = null;
    setConfirmState(null);
  };

  const api = useMemo(() => ({ openTaskForm, closeTaskForm, confirm }), [openTaskForm, closeTaskForm, confirm]);

  return (
    <UIContext.Provider value={api}>
      {children}
      {taskForm && <TaskFormModal {...taskForm} onClose={closeTaskForm} />}
      <Modal
        open={Boolean(confirmState)}
        title={confirmState?.title}
        description={confirmState?.message}
        onClose={() => settle(false)}
        size="sm"
        initialFocus="[data-autofocus]"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => settle(false)} data-autofocus>
              {confirmState?.cancelLabel || 'Cancel'}
            </button>
            <button type="button" className={`btn ${confirmState?.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => settle(true)}>
              {confirmState?.confirmLabel || 'Confirm'}
            </button>
          </>
        }
      >
        {confirmState?.body || null}
      </Modal>
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx;
}
