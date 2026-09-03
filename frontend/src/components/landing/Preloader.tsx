'use client';

import { useState, useEffect } from 'react';

export function Preloader() {
  const [progress, setProgress] = useState(12);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setIsDone(true), 350);
          return 100;
        }
        // Organic acceleration curve towards 100
        const increment = prev < 50 ? 4 : prev < 85 ? 6 : 5;
        return Math.min(100, prev + increment);
      });
    }, 35);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`preloader-overlay ${isDone ? 'hidden' : ''}`}>
      <div className="preloader-bar-track">
        <div className="preloader-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="preloader-counter">
        {progress}%
      </div>
    </div>
  );
}
