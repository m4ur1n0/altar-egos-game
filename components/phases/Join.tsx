'use client';
import { useState } from 'react';
import game from '@/config/game.json';
import { useGame } from '@/lib/context';
import { Roster } from '../Character';

function RoomLine() {
  const { g } = useGame();
  const fresh = () => { location.search = '?room=' + Math.random().toString(36).slice(2, 7); };
  return (
    <div className="m" style={{ marginTop: 14 }}>
      room <b>{g.room}</b>. friends join with this page’s link.{' '}
      <button className="o" style={{ padding: '3px 12px', fontSize: 13 }} onClick={fresh}>new room</button>
    </div>
  );
}

export function Join() {
  const { g } = useGame();
  const [name, setName] = useState(g.P[g.uid]?.real || '');
  if (g.S.phase !== 'lobby') return <div className="box">this game already started, sorry!<RoomLine /></div>;
  return (
    <div className="box">
      <h2>Join</h2>
      <div className="m">{game.tagline}</div>
      <label>Your real name</label>
      <input maxLength={20} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name.trim() && g.join(name.trim())} />
      <br /><br />
      <button onClick={() => name.trim() && g.join(name.trim())}>Join</button>
      <div style={{ marginTop: 12 }}><Roster /></div>
      <RoomLine />
    </div>
  );
}

export function Lobby() {
  return (
    <div className="box">
      <h2>Lobby</h2>
      <div className="m">waiting on everybody to show up...</div>
      <Roster />
      <RoomLine />
    </div>
  );
}
