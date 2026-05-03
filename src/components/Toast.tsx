import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  onDone: () => void;
}

export function Toast({ message, onDone }: ToastProps) {
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    const fade = window.setTimeout(() => setPhase('out'), 2200);
    const done = window.setTimeout(onDone, 2600);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(done);
    };
  }, [onDone]);

  return <div className={`toast ${phase}`}>✓ {message}</div>;
}
