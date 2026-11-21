'use client';
import { useState } from 'react';
import game from '@/config/game.json';
import { useGame } from '@/lib/context';
import { SubmitBar, useSubmitted } from './Submit';

export function Joke() {
  const { g } = useGame();
  const [jokes, setJokes] = useState<string[]>(() => Array(game.standup.jokes).fill(''));
  const done = useSubmitted();
  const submit = (force?: boolean) => {
    const j = jokes.map(x => x.trim());
    if (force && !j.some(Boolean)) return;
    g.submit('jokes', j);
  };
  return (
    <div className="box">
      <h2>First task</h2>
      <p>{game.standup.instructions}</p>
      {jokes.map((j, i) => (
        <div key={i}>
          <label>Joke {i + 1}</label>
          <textarea className="jk" disabled={done} value={j} onChange={e => setJokes(jokes.map((x, k) => k === i ? e.target.value : x))} />
        </div>
      ))}
      <br />
      <SubmitBar submit={submit} />
    </div>
  );
}
