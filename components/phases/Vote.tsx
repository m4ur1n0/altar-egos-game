'use client';
import { useGame } from '@/lib/context';
import { Avatar, Material } from '../Character';

export function Vote() {
  const { g } = useGame();
  const hs = g.others(), mine = g.myVote()?.guesses || {};
  return (
    <div className="box">
      <div className="m">round {g.roundNo()}</div>
      <h2>Who is who?</h2>
      <div className="m">Guess who is behind each character. Change your mind any time before the timer ends.</div>
      {hs.length ? hs.map(p => (
        <div key={p.id} className="it" style={{ flexWrap: 'wrap' }}>
          <Avatar id={p.id} />
          <div style={{ flex: 1, minWidth: 0 }}><b>{g.cn(p.id)}</b><br /><span className="m">{p.char?.occ} / {p.char?.loc}</span></div>
          <select style={{ width: '44%' }} value={mine[p.id] || ''} onChange={e => g.guess(p.id, e.target.value)}>
            <option value="">?</option>
            {hs.map(x => <option key={x.id} value={x.id}>{x.real}</option>)}
          </select>
          <div style={{ flexBasis: '100%' }}><Material k={'r' + g.S.round} pid={p.id} /></div>
        </div>
      )) : <div className="m">No one else is playing.</div>}
    </div>
  );
}
