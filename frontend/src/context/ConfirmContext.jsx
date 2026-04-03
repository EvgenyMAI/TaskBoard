import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

const ConfirmContext = createContext(null);

/**
 * @param {object} options
 * @param {string} [options.title]
 * @param {string} [options.message]
 * @param {string} [options.confirmText]
 * @param {string} [options.cancelText]
 * @param {boolean} [options.danger] — красная кнопка подтверждения
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    const {
      title = 'Подтверждение',
      message = '',
      confirmText = 'Подтвердить',
      cancelText = 'Отмена',
      danger = false,
    } = options;
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ title, message, confirmText, cancelText, danger });
    });
  }, []);

  const finish = useCallback((value) => {
    setState(null);
    const r = resolverRef.current;
    resolverRef.current = null;
    r?.(value);
  }, []);

  useEffect(() => {
    if (!state) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') finish(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, finish]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="overlay overlay-confirm"
          role="presentation"
          onClick={() => finish(false)}
        >
          <div
            className="modal card confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-dialog-title" className="confirm-dialog-title">
              {state.title}
            </h2>
            <p id="confirm-dialog-desc" className="confirm-dialog-body">
              {state.message}
            </p>
            <div className="form-actions confirm-dialog-actions">
              <button type="button" className="secondary" onClick={() => finish(false)}>
                {state.cancelText}
              </button>
              <button
                type="button"
                className={state.danger ? 'danger' : undefined}
                onClick={() => finish(true)}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx;
}
