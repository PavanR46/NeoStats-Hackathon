'use client';

import { useEffect, useState } from 'react';

// Re-renders the component every `intervalMs` so countdowns stay live without reloading
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}