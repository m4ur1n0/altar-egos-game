'use client';
import game from '@/config/game.json';
import { useGame } from '@/lib/context';

const FIELDS = game.character.fields as { key: string; label: string; max: number; line?: number; multiline?: boolean }[];
const LINES = [...new Set(FIELDS.map(f => f.line).filter(Boolean))] as number[];

export function Avatar({ id }: { id: string }) {
  const c = useGame().g.P[id]?.char;
  if (c?.pic) return <img className="av" src={c.pic} alt="" />;
  return <div className="av">{(c?.name || '?')[0].toUpperCase()}</div>;
}

// Name, then each "line" of fields joined by " / ", then multiline fields (bio) as paragraphs.
export function CharacterCard({ id }: { id: string }) {
  const c = useGame().g.P[id]?.char || {};
  return (
    <>
      <div className="it" style={{ border: 0, padding: 0 }}>
        <Avatar id={id} />
        <div>
          {LINES.map((l, i) => {
            const s = FIELDS.filter(f => f.line === l).map(f => c[f.key]).filter(Boolean).join(' / ');
            return i === 0
              ? <span key={l}><b>{c.name}</b> <span className="m">{s}</span></span>
              : <span key={l}><br /><span className="m">{s}</span></span>;
          })}
        </div>
      </div>
      {FIELDS.filter(f => f.multiline && c[f.key]).map(f => <p key={f.key} style={{ margin: '6px 0 0' }}>{c[f.key]}</p>)}
    </>
  );
}

export function Material({ k, pid }: { k: string; pid: string }) {
  const s = useGame().g.subOf(k, pid);
  if (!s) return <span className="m">(no answer)</span>;
  if (s.kind === 'draw') return <img src={s.data} style={{ width: '100%', borderRadius: 18 }} alt="" />;
  return <span style={{ whiteSpace: 'pre-wrap' }}>{s.data}</span>;
}

export function Roster() {
  const { g } = useGame();
  return (
    <div>
      {g.players.map(p => (
        <div key={p.id} className="it" style={{ padding: '4px 0', border: 0 }}>
          <b style={{ flex: 1 }}>{p.real}</b>
          <span className="m">{g.S.phase === 'create' ? (p.char ? 'ready' : 'writing...') : ''}</span>
        </div>
      ))}
    </div>
  );
}
