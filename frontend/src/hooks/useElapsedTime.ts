'use client';

import { useEffect, useState } from 'react';

/**
 * useElapsedTime — returns a formatted elapsed time string (HH:MM:SS)
 * since the given start timestamp. Updates every second.
 */
export function useElapsedTime(startTs: string | undefined): string {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    if (!startTs) return;

    const startMs = new Date(startTs).getTime();

    const tick = () => {
      const diffMs = Date.now() - startMs;
      const h = Math.floor(diffMs / 3_600_000);
      const m = Math.floor((diffMs % 3_600_000) / 60_000);
      const s = Math.floor((diffMs % 60_000) / 1_000);
      setElapsed(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTs]);

  return elapsed;
}

/**
 * useTimeAgo — returns a human-readable "time ago" string.
 */
export function useTimeAgo(ts: string | undefined): string {
  const [ago, setAgo] = useState('');

  useEffect(() => {
    if (!ts) return;

    const compute = () => {
      const diffMs = Date.now() - new Date(ts).getTime();
      const s = Math.floor(diffMs / 1000);
      if (s < 60) return `${s}s ago`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      return `${h}h ago`;
    };

    setAgo(compute());
    const interval = setInterval(() => setAgo(compute()), 10_000);
    return () => clearInterval(interval);
  }, [ts]);

  return ago;
}
