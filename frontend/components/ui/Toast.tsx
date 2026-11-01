'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: Tone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi>({ success: () => {}, error: () => {}, info: () => {} });

export const useToast = () => useContext(ToastContext);

const TONE_STYLES: Record<Tone, { border: string; icon: React.ReactNode }> = {
  success: { border: 'border-success/30', icon: <CheckCircle2 className="h-4 w-4 text-success" /> },
  error: { border: 'border-danger/30', icon: <AlertCircle className="h-4 w-4 text-danger" /> },
  info: { border: 'border-info/30', icon: <Info className="h-4 w-4 text-info" /> },
};

const LOOKS_LIKE_ERROR = /fail|error|cannot|can't|denied|forbidden|invalid|not allowed|only a|unable|unauthor/i;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: Tone, message: string) => {
      const id = nextId.current++;
      setItems((prev) => [...prev.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push]
  );

  // Transitional shim: existing pages call alert(...). Show those as toasts instead of browser popups.
  // New code should call useToast() directly.
  useEffect(() => {
    const original = window.alert;
    window.alert = (message?: unknown) => {
      const text = String(message ?? '');
      push(LOOKS_LIKE_ERROR.test(text) ? 'error' : 'info', text);
    };
    return () => {
      window.alert = original;
    };
  }, [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-[100] flex w-[min(92vw,22rem)] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`toast-in flex items-start gap-3 rounded-xl border bg-surface/95 px-4 py-3 shadow-lg backdrop-blur ${TONE_STYLES[t.tone].border}`}
          >
            <span className="mt-0.5 shrink-0">{TONE_STYLES[t.tone].icon}</span>
            <p className="flex-1 text-sm text-fg">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="text-fg-subtle hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}