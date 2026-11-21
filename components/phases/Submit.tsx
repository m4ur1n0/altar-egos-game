'use client';
import { useEffect, useRef } from 'react';
import { useGame } from '@/lib/context';

// Submit button + "n/m locked in". Calls submit(true) once when the timer hits zero if not yet submitted.
export function SubmitBar({ submit }: { submit: (force?: boolean) => void }) {
  const { g, now } = useGame();
  const done = !!g.subOf(g.curKey(), g.uid), auto = useRef(false), { left } = g.timer(now);
  useEffect(() => {
    if (left === 0 && !done && !auto.current) { auto.current = true; submit(true); }
  });
  return (
    <>
      <button disabled={done} onClick={() => submit()}>{done ? 'Submitted' : 'Submit'}</button>{' '}
      <span className="m">{g.players.filter(p => g.subOf(g.curKey(), p.id)).length}/{g.players.length} locked in</span>
    </>
  );
}

export const useSubmitted = () => { const { g } = useGame(); return !!g.subOf(g.curKey(), g.uid); };
