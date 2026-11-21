'use client';
import game from '@/config/game.json';
import { useGame } from '@/lib/context';
import { fmtTime } from '@/lib/game';
import { CharacterCard } from '../Character';

export function Meet() {
  const { g } = useGame();
  return (
    <div className="box">
      <div className="m">before the first task</div>
      <h2>Meet the characters</h2>
      <div className="m">Read everyone’s profile. You have {fmtTime(game.durations.meet)}. Profiles stay in the PROFILES tab all game.</div>
      {g.players.filter(p => p.char).map(p => (
        <div key={p.id} style={{ marginTop: 20 }}>
          <CharacterCard id={p.id} />
          {p.id === g.uid && <div className="m">(you)</div>}
        </div>
      ))}
    </div>
  );
}
