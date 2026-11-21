'use client';
import game from '@/config/game.json';
import { useGame } from '@/lib/context';
import { Avatar } from '../Character';
import { ChatInput, Feed } from '../Chat';

export function Perf() {
  const { g } = useGame();
  const p = g.performer(g.S.round), jokes: string[] = (g.subOf('joke', p)?.data || []).filter(Boolean);
  return (
    <>
      <div className="box">
        <h2>Performance</h2>
        <div className="m">now performing</div>
        <div className="it" style={{ border: 0, padding: '0 0 8px' }}><Avatar id={p} /><b style={{ alignSelf: 'center' }}>{g.cn(p)}</b></div>
        <ol>{jokes.length ? jokes.map((x, i) => <li key={i}>{x}</li>) : <li className="m">(they wrote nothing)</li>}</ol>
      </div>
      <div className="box">
        <div className="m" style={{ marginBottom: 6 }}>Comment and engage. Messages arrive after a {game.chat.perfDelaySeconds} second delay.</div>
        <Feed ch={'p' + g.S.round} id="pf" />
        <ChatInput ch={'p' + g.S.round} id="pi" placeholder="Comment" />
      </div>
    </>
  );
}

export function PerfVote() {
  const { g } = useGame();
  if (g.performer(g.S.round) === g.uid)
    return <div className="box"><h2>The audience is voting</h2><div className="m">Your performance is being judged.</div></div>;
  const down = g.myPVote()?.up === false;
  return (
    <div className="box">
      <h2>Rate the performance</h2>
      <div className="m">Votes are secret. Final answer when the timer ends.</div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className={down ? 'o' : ''} onClick={() => g.pvote(true)}>Thumbs up</button>
        <button className={down ? '' : 'o'} onClick={() => g.pvote(false)}>Thumbs down</button>
      </div>
    </div>
  );
}

export function End() {
  const { g } = useGame();
  return (
    <div className="box">
      <h2>Final scores</h2>
      {g.ranked().map((x, i) => (
        <div key={x.p.id} className="it">
          <div className="big" style={{ width: 40 }}>{i + 1}</div>
          <div style={{ flex: 1 }}><b>{x.p.real}</b></div>
          <div className="big">{x.t}</div>
        </div>
      ))}
      <div className="m" style={{ marginTop: 8 }}>No characters were revealed.</div>
    </div>
  );
}
