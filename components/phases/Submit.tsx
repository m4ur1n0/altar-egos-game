'use client';
import { useEffect, useRef } from 'react';
import { useGame } from '@/lib/context';
import { peek } from '@/lib/store';

// Runs fn when this phase/round actually ends (not on React's dev double-mount), using the latest fn.
// The host advances the moment the timer ends, so this saves whatever a player had typed or drawn.
export function useOnPhaseEnd(fn: () => void) {
  const { g } = useGame(), f = useRef(fn), S = g.S;
  f.current = fn;
  useEffect(() => () => {
    const s = peek('game/state');
    if (s && (s.phase !== S.phase || s.round !== S.round || s.gen !== S.gen)) f.current();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

// Submit button + "n/m locked in". Auto-submits when the timer hits zero or the phase ends.
export function SubmitBar({ submit }: { submit: (force?: boolean) => void }) {
  const { g, now } = useGame();
  const done = !!g.subOf(g.curKey(), g.uid), auto = useRef(false), { left } = g.timer(now);
  const autoSubmit = () => { if (!done && !auto.current) { auto.current = true; submit(true); } };
  useEffect(() => { if (left === 0) autoSubmit(); });
  useOnPhaseEnd(autoSubmit);
  return (
    <>
      <button disabled={done} onClick={() => submit()}>{done ? 'Submitted' : 'Submit'}</button>{' '}
      <span className="m">{g.players.filter(p => g.subOf(g.curKey(), p.id)).length}/{g.players.length} locked in</span>
    </>
  );
}

export const useSubmitted = () => { const { g } = useGame(); return !!g.subOf(g.curKey(), g.uid); };
