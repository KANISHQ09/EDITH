'use client';

import { useState, useEffect } from 'react';

interface PreloaderProps {
  onComplete?: () => void;
}

export function Preloader({ onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(12);
  const [isFading, setIsFading] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    let fadeTimer: NodeJS.Timeout;
    let unmountTimer: NodeJS.Timeout;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }

        // Organic acceleration curve towards 100
        const increment = prev < 50 ? 4 : prev < 85 ? 6 : 5;
        const next = prev + increment;

        if (next >= 100) {
          clearInterval(timer);

          // Cool time: hold at 100% for 1.5 seconds before fading
          fadeTimer = setTimeout(() => {
            setIsFading(true);
            if (onComplete) {
              onComplete();
            }

            // After fade out completes (800ms), unmount from DOM completely
            unmountTimer = setTimeout(() => {
              setIsMounted(false);
            }, 800);
          }, 1500);

          return 100;
        }

        return next;
      });
    }, 35);

    return () => {
      clearInterval(timer);
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, [onComplete]);

  if (!isMounted) return null;

  return (
    <div className={`preloader-overlay ${isFading ? 'hidden' : ''}`}>
      <div className="preloader-bar-track">
        <div className="preloader-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="preloader-counter">
        {progress}%
      </div>
    </div>
  );
}
