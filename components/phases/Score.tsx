'use client';
import { useState } from 'react';
import boons from '@/config/boons.json';
import game from '@/config/game.json';
import { useGame } from '@/lib/context';
import { type Boon as BoonDoc, type Like, type Note } from '@/lib/game';

const SC = game.scoring, sign = (n: number) => (n >= 0 ? '+' : '') + n;
const BOONS = boons as Record<string, string>;

export function Score() {
  const { g } = useGame();
  const t = g.tally(g.uid, g.S.round);
  return (
    <>
      <div className="box">
        <div className="m">round {g.roundNo()} results</div>
        <h2>Your points</h2>
        <div className="big0">{sign(t.t)}</div>
        <div>
          Likes received: {sign(t.L * SC.like)}<br />
          {g.rt().favorite && <>Favorite votes: {sign(t.F * SC.favorite)}<br /></>}
          People who guessed you: {sign(t.by * SC.guessedBy)}<br />
          Your correct guesses: {sign(t.hit * SC.correctGuess)}
          {t.take !== 0 && <><br />Points taken: {sign(t.take * SC.takePoint)}</>}
        </div>
      </div>
      <Boon />
    </>
  );
}

// Round winner(s) (most likes + favorites) pick one boon.
function Boon() {
  const { g } = useGame();
  const [k, setK] = useState('');
  const [target, setTarget] = useState('');
  const [guess, setGuess] = useState('');
  const others = g.others(), r = g.S.round;
  const b = g.g<BoonDoc>('boons').find(d => d.r === r && d.from === g.uid);
  if (!g.winners(r).includes(g.uid)) return null;
  const t = target || others[0]?.id || '', gu = guess || others[0]?.id || '';

  if (b) {
    let res: React.ReactNode = '';
    if (b.kind === 'guess') res = b.guess === b.target ? 'CONFIRMED. That character is them.' : 'DENIED. That character is not them.';
    if (b.kind === 'notes') { const n = g.g<Note>('notes').find(d => d.id === b.target); res = <>Notebook of {g.cn(b.target!)}:<br /><br /><span style={{ whiteSpace: 'pre-wrap' }}>{n?.text || '(empty)'}</span></>; }
    if (b.kind === 'likers') { const l = g.g<Like>('likes').filter(d => d.r === r && (d.items.includes(g.uid) || d.fav === g.uid)).map(d => g.cn(d.from)); res = l.length ? 'Liked by: ' + l.join(', ') : 'No one.'; }
    if (b.kind === 'top') res = g.ranked().slice(0, 3).map((x, i) => <div key={x.p.id}>{i + 1}. {x.p.real} ({x.t})</div>);
    if (b.kind === 'take') res = `You took a point from ${g.cn(b.target!)}.`;
    return <div className="box"><h2>Your boon</h2><div className="m">{BOONS[b.kind]}</div><div style={{ margin: '15px 0' }}>{res}</div></div>;
  }

  const charSel = (
    <><label>Which character</label>
      <select value={t} onChange={e => setTarget(e.target.value)}>{others.map(p => <option key={p.id} value={p.id}>{g.cn(p.id)}</option>)}</select></>
  );
  return (
    <div className="box">
      <h2>You earned a boon</h2>
      <div className="m">You got the most likes. Pick one.</div>
      <div style={{ marginTop: 8 }}>
        {Object.entries(BOONS).map(([x, l]) => (
          <button key={x} className={k === x ? '' : 'o'} style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 6 }} onClick={() => setK(x)}>{l}</button>
        ))}
      </div>
      {k && (
        <div>
          {(k === 'guess' || k === 'notes' || k === 'take') && charSel}
          {k === 'guess' && <><label>Who is it</label>
            <select value={gu} onChange={e => setGuess(e.target.value)}>{others.map(p => <option key={p.id} value={p.id}>{p.real}</option>)}</select></>}
          <br />
          <button onClick={() => g.pickBoon(k, ['guess', 'notes', 'take'].includes(k) ? t : null, k === 'guess' ? gu : null)}>Confirm</button>
        </div>
      )}
    </div>
  );
}
