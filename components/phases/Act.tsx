'use client';
import { useRef, useState } from 'react';
import { useGame } from '@/lib/context';
import { roundType } from '@/lib/game';
import { DrawingCanvas } from '../DrawingCanvas';
import { SubmitBar, useSubmitted } from './Submit';

// One round's task: answer the prompt in text, or draw it.
export function Act() {
  const { g } = useGame();
  const rt = roundType(g.S.round), draw = rt.kind === 'draw';
  const [text, setText] = useState('');
  const cv = useRef<HTMLCanvasElement>(null);
  const done = useSubmitted();
  const submit = (force?: boolean) => {
    if (draw) { if (cv.current) g.submit('draw', cv.current.toDataURL('image/jpeg', 0.7)); }
    else if (text.trim() || !force) g.submit('text', text.trim());
  };
  return (
    <div className="box">
      <div className="m">round {g.S.round + 1} / {rt.label}</div>
      <h2>{g.promptFor(g.S.round)}</h2>
      {draw
        ? <DrawingCanvas ref={cv} locked={done} />
        : <><textarea id="ta" style={{ minHeight: 160 }} placeholder="No word limit." disabled={done} value={text} onChange={e => setText(e.target.value)} /><br /><br /></>}
      <SubmitBar submit={submit} />
    </div>
  );
}
