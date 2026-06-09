import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { Terminal, X } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
  undoAction?: () => void;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], undoAction?: () => void) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastIdCounter = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, number>>(new Map());

  const dismissToast = (id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((t) => t.id !== id));
  };

  const showToast = (message: string, type: Toast['type'] = 'info', undoAction?: () => void) => {
    const id = toastIdCounter++;
    const duration = undoAction ? 6000 : 3500;

    setToasts((current) => [...current, { id, message, type, undoAction }]);

    const timer = window.setTimeout(() => {
      dismissToast(id);
    }, duration);

    timersRef.current.set(id, timer);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      for (const timer of timersRef.current.values()) {
        window.clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, []);

  const value = useMemo(() => ({ showToast, dismissToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 min-w-[320px] max-w-[420px] pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto relative overflow-hidden border p-4 shadow-[4px_4px_0px_#000000] transition-all duration-300 md:max-w-md ${
              toast.type === 'success'
                ? 'bg-black text-[#c4ff0e] border-[#c4ff0e]/30'
                : toast.type === 'warn'
                ? 'bg-black text-[#f97316] border-[#f97316]/30'
                : toast.type === 'error'
                ? 'bg-black text-red-500 border-red-500/30'
                : 'bg-black text-[#d7dbe3] border-[#d7dbe3]/20'
            }`}
          >
            {/* Top scanning accent indicator */}
            <div
              className={`absolute top-0 left-0 right-0 h-[2px] animate-pulse ${
                toast.type === 'success'
                  ? 'bg-[#c4ff0e]'
                  : toast.type === 'warn'
                  ? 'bg-[#f97316]'
                  : toast.type === 'error'
                  ? 'bg-red-500'
                  : 'bg-white'
              }`}
            />

            <div className="flex items-start gap-3">
              <Terminal className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-[11px] font-bold tracking-wider uppercase mb-1">
                  [ {toast.type} INCOMING ]
                </div>
                <div className="font-mono text-[12px] leading-relaxed tracking-wide text-neutral-300">
                  {toast.message}
                </div>

                {toast.undoAction && (
                  <button
                    onClick={() => {
                      toast.undoAction?.();
                      dismissToast(toast.id);
                    }}
                    className="mt-2 border border-current px-3 py-1 font-mono text-[10px] text-black bg-current hover:bg-transparent hover:text-inherit font-bold transition-all"
                  >
                    UNDO OPERATIONS
                  </button>
                )}
              </div>

              <button
                onClick={() => dismissToast(toast.id)}
                className="text-neutral-500 hover:text-white transition-colors"
                aria-label="Dismiss Notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="absolute right-2 bottom-1 font-mono text-[8px] text-neutral-700 select-none">
              TERMINAL_LOG_V{toast.id}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
