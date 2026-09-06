'use client';

import { useState, useEffect, useRef } from 'react';

interface PreloaderProps {
  onComplete?: () => void;
}

export function Preloader({ onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(15);
  const [isFading, setIsFading] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  // Keep latest reference to onComplete to avoid re-triggering the effect
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let fadeTimer: NodeJS.Timeout;
    let unmountTimer: NodeJS.Timeout;
    let completed = false;

    const finishPreloader = () => {
      if (completed) return;
      completed = true;
      setProgress(100);

      // Brief pause at 100% before smooth fade out
      fadeTimer = setTimeout(() => {
        setIsFading(true);
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }

        unmountTimer = setTimeout(() => {
          setIsMounted(false);
        }, 600);
      }, 350);
    };

    // Fast, organic acceleration to 100%
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          finishPreloader();
          return 100;
        }

        const increment = prev < 50 ? 8 : prev < 85 ? 12 : 10;
        const next = prev + increment;

        if (next >= 100) {
          clearInterval(interval);
          finishPreloader();
          return 100;
        }

        return next;
      });
    }, 28);

    // Hard fallback safety watchdog: guarantee dismissal after at most 2.2s
    const safetyWatchdog = setTimeout(() => {
      clearInterval(interval);
      finishPreloader();
    }, 2200);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
      clearTimeout(safetyWatchdog);
    };
  }, []); // Run only once on mount!

  if (!isMounted) return null;

  return (
    <div
      className={`preloader-overlay ${isFading ? 'hidden' : ''}`}
      style={{
        pointerEvents: isFading ? 'none' : 'auto',
      }}
    >
      <div className="preloader-bar-track">
        <div className="preloader-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="preloader-counter">
        {progress}%
      </div>
    </div>
  );
}
