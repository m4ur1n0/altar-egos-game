'use client';
import { useGame } from '@/lib/context';
import { hash } from '@/lib/game';
import { Avatar, Material } from '../Character';

export function Review() {
  const { g } = useGame();
  const k = 'r' + g.S.round, rt = g.rt(), mine = g.myLike();
  const list = g.others().sort((a, b) => hash(g.S.gen + k + a.id) - hash(g.S.gen + k + b.id));
  return (
    <div className="box">
      <div className="m">round {g.roundNo()}</div>
      <h2>Review the material</h2>
      <div className="m">Like what you like. Likes are secret and you can’t like your own.</div>
      {rt.favorite && <div className="m"><b>{rt.label} round:</b> also pick ONE favorite. A favorite is worth an extra point.</div>}
      {list.map(p => {
        const s = g.subOf(k, p.id), liked = mine.items.includes(p.id), faved = mine.fav === p.id;
        return (
          <div key={p.id} className="it">
            <Avatar id={p.id} />
            <div style={{ flex: 1, minWidth: 0 }}><b>{g.cn(p.id)}</b><br /><Material k={k} pid={p.id} /></div>
            {s && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className={liked ? 'on2' : 'o'} onClick={() => g.like(p.id)}>{liked ? 'Liked' : 'Like'}</button>
                {rt.favorite && <button className={faved ? 'on2' : 'o'} onClick={() => g.setFav(p.id)}>{faved ? 'Favorite *' : 'Favorite'}</button>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
