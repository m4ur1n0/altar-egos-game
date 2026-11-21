'use client';
import { useRef, useState } from 'react';
import { useGame } from '@/lib/context';
import { DrawingCanvas } from '../DrawingCanvas';
import { SubmitBar, useSubmitted } from './Submit';

// One round's task, by the round type's kind: answer in text, draw, or write a standup set.
export function Act() {
  const { g } = useGame();
  const rt = g.rt(), done = useSubmitted();
  const [text, setText] = useState('');
  const [jokes, setJokes] = useState<string[]>(() => Array(rt.entries ?? 3).fill(''));
  const cv = useRef<HTMLCanvasElement>(null), img = useRef('');

  const submit = (force?: boolean) => {
    if (rt.kind === 'draw') { const d = cv.current?.toDataURL('image/jpeg', 0.7) || img.current; if (d) g.submit('draw', d); }
    else if (rt.kind === 'standup') { const j = jokes.map(x => x.trim()); if (!force || j.some(Boolean)) g.submit('jokes', j); }
    else if (text.trim() || !force) g.submit('text', text.trim());
  };

  return (
    <div className="box">
      <div className="m">{rt.big ? rt.label : `round ${g.roundNo()} / ${rt.label}`}</div>
      <h2>{g.promptFor(g.S.round)}</h2>
      {rt.kind === 'draw' && <DrawingCanvas ref={cv} locked={done} onDraw={u => { img.current = u; }} />}
      {rt.kind === 'text' && <><textarea style={{ minHeight: 160 }} placeholder="No word limit." disabled={done} value={text} onChange={e => setText(e.target.value)} /><br /><br /></>}
      {rt.kind === 'standup' && <>
        {jokes.map((j, i) => (
          <div key={i}>
            <label>Joke {i + 1}</label>
            <textarea disabled={done} value={j} onChange={e => setJokes(jokes.map((x, k) => k === i ? e.target.value : x))} />
          </div>
        ))}
        <br />
      </>}
      <SubmitBar submit={submit} />
    </div>
  );
}
