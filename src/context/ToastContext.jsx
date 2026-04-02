import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'success', title, desc }) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, desc }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-5 right-5 z-[400] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="toast-enter pointer-events-auto flex gap-3 items-start w-[360px] bg-white rounded-lg shadow-xl p-4"
            style={{ borderLeft: `4px solid ${t.type === 'success' ? '#1F4D3A' : t.type === 'error' ? '#DC2626' : '#D97706'}` }}
          >
            <span className="text-base flex-shrink-0 mt-0.5">
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : '⚠'}
            </span>
            <div className="flex-1">
              <div className="font-semibold text-gray-900 text-sm">{t.title}</div>
              {t.desc && <div className="text-gray-500 text-xs mt-0.5">{t.desc}</div>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none flex-shrink-0"
            >×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
