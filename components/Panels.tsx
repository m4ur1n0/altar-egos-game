'use client';
import { useRef, useState } from 'react';
import cards from '@/config/cards.json';
import { useGame } from '@/lib/context';
import { ROUNDS, roundType, type Card } from '@/lib/game';
import { Avatar, CharacterCard } from './Character';

const BG = ['wizard', 'robot', 'horse', 'lion', 'clam', 'poet', 'dino'];

export function Background() {
  return <div id="bg">{BG.map((n, i) => <img key={n} className={'abcdefg'[i]} src={`/bg-${n}.webp`} alt="" />)}</div>;
}

// Full-screen rules card shown before joke / round / performance phases until S.t0.
export function IntroCard() {
  const { g, now } = useGame();
  const { S } = g;
  if (!g.me || now >= S.t0 || !['joke', 'act', 'perf'].includes(S.phase)) return null;
  const c: Card = S.phase === 'act' ? roundType(S.round).card : cards[S.phase as 'joke' | 'perf'];
  const title = c.title + (S.phase === 'act' ? ` ${S.round + 1} OF ${ROUNDS.length}` : S.phase === 'perf' ? ' ' + (S.round + 1) : '');
  return (
    <div id="card">
      <div className="t">{title}</div>
      <div className="s">{c.subtitle}{S.phase === 'perf' && ' / ' + g.cn(g.performer(S.round)).toUpperCase()}</div>
      <ul>{c.rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
      <div className="big" style={{ marginTop: 20 }}>starts in {Math.max(0, Math.ceil((S.t0 - now) / 1000))}</div>
    </div>
  );
}

export function HostControls() {
  const { g } = useGame();
  if (!g.isHost) return null;
  const ps = g.players, rd = ps.filter(p => p.char).length;
  switch (g.S.phase) {
    case 'lobby': return <button disabled={ps.length < 1} onClick={() => g.go('start')}>Start ({ps.length} joined)</button>;
    case 'create': return <button disabled={rd < ps.length} onClick={() => g.go('begin')}>Begin game ({rd}/{ps.length} ready)</button>;
    case 'end': return <button onClick={() => g.go('new')}>New game</button>;
    default: return <button className="o" onClick={() => g.go('skip')}>Skip ahead</button>;
  }
}

export function Profiles() {
  const { g } = useGame();
  const [pv, setPv] = useState<string | null>(null);
  const c = pv ? g.P[pv]?.char : null;
  if (pv && c) return (
    <div className="box">
      <CharacterCard id={pv} />
      {c.pic && <><br /><img src={c.pic} style={{ width: 160, borderRadius: 18 }} alt="" /></>}
      <br /><br /><button className="o" onClick={() => setPv(null)}>Back</button>
    </div>
  );
  return (
    <div className="box">
      <h2>Profiles</h2>
      <div className="m">Tap a character to see their info.</div>
      {g.players.filter(x => x.char).map(x => (
        <div key={x.id} className="it" style={{ cursor: 'pointer' }} onClick={() => setPv(x.id)}>
          <Avatar id={x.id} />
          <div><b>{x.char!.name}</b>{x.id === g.uid && <> <span className="m">(you)</span></>}<br /><span className="m">{x.char!.occ}</span></div>
        </div>
      ))}
    </div>
  );
}

export function Notebook({ hidden }: { hidden: boolean }) {
  const { g } = useGame();
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  return (
    <div className="box" hidden={hidden}>
      <h2>Notebook</h2>
      <div className="m">Private notes. Only you can see them.</div>
      <textarea style={{ minHeight: 300, marginTop: 8 }} placeholder="Who is who? Observations? Anything."
        onChange={e => { const v = e.target.value; clearTimeout(t.current); t.current = setTimeout(() => g.saveNote(v), 500); }} />
    </div>
  );
}
