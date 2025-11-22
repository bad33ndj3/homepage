import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/Card';

const DEFAULT_MINUTES = 25;
const MINUTE = 60;

export function FocusTimer() {
  const [remaining, setRemaining] = useState(DEFAULT_MINUTES * MINUTE);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      setRunning(false);
      return;
    }

    const timer = window.setInterval(() => {
      setRemaining((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running, remaining]);

  const reset = () => {
    setRunning(false);
    setRemaining(DEFAULT_MINUTES * MINUTE);
  };

  const [minutes, seconds] = useMemo(() => {
    const mins = Math.floor(remaining / MINUTE);
    const secs = remaining % MINUTE;
    return [mins, secs];
  }, [remaining]);

  return (
    <Card
      title="Focus Timer"
      subtitle="Simple pomodoro-style countdown"
      actions={
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white hover:border-accent"
        >
          Reset
        </button>
      }
    >
      <div className="flex flex-col items-center justify-center gap-4">
        <p className="text-5xl font-semibold tabular-nums text-white">
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-xl bg-accent px-5 py-2 text-sm font-medium text-slate-950"
            onClick={() => setRunning((prev) => !prev)}
          >
            {running ? 'Pause' : 'Start'}
          </button>
          <button
            type="button"
            className="rounded-xl border border-white/15 px-5 py-2 text-sm text-white"
            onClick={() => {
              if (!running) {
                setRemaining((prev) => prev + 5 * MINUTE);
              }
            }}
          >
            +5m
          </button>
        </div>
      </div>
    </Card>
  );
}
