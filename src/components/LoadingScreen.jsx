import { useState, useEffect } from 'react';
import './LoadingScreen.css';

export function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          if (onComplete) onComplete();
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <h2>Loading your 3D Book</h2>
        <p>A little patience, please...</p>
        <div className="progress-circle">
          <svg width="120" height="120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#e0e0e0"
              strokeWidth="4"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#ff6b35"
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="progress-text">{progress}%</div>
        </div>
      </div>
    </div>
  );
}
