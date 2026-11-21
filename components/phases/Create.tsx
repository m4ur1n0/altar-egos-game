'use client';
import { useEffect, useRef, useState } from 'react';
import game from '@/config/game.json';
import { useGame } from '@/lib/context';
import { Roster } from '../Character';
import { ImageSearch } from '../ImageSearch';
import { useOnPhaseEnd } from './Submit';

const C = game.character;

// Center-crop and shrink an uploaded image to a small square JPEG data URL.
function pic(f: Blob): Promise<string> {
  return new Promise(res => {
    const i = new Image();
    i.onload = () => {
      const c = document.createElement('canvas'), s = Math.min(i.width, i.height);
      c.width = c.height = C.pictureSize;
      c.getContext('2d')!.drawImage(i, (i.width - s) / 2, (i.height - s) / 2, s, s, 0, 0, C.pictureSize, C.pictureSize);
      res(c.toDataURL('image/jpeg', 0.7));
      URL.revokeObjectURL(i.src);
    };
    i.onerror = () => res('');
    i.src = URL.createObjectURL(f);
  });
}

export function Create() {
  const { g, now } = useGame();
  const old = g.me?.char || {};
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(C.fields.map(f => [f.key, old[f.key] || ''])));
  const [img, setImg] = useState(old.pic || '');
  const [ok, setOk] = useState('');
  const auto = useRef(false);
  const val = (k: string) => (v[k] || '').trim();
  const choose = async (f?: Blob) => { if (f) setImg(await pic(f)); };

  function save() {
    if (!val('name')) { setOk('Name your character first.'); return; }
    g.save({ char: { ...Object.fromEntries(C.fields.map(f => [f.key, val(f.key)])), pic: img } });
    setOk('Saved.');
  }

  // Time's up (or the game moved on): save whatever is typed, falling back to what was saved before.
  const autoSave = () => {
    if (auto.current) return;
    auto.current = true;
    g.save({ char: { ...Object.fromEntries(C.fields.map(f => [f.key, val(f.key) || old[f.key] || ''])), name: val('name') || old.name || 'Nameless', pic: img } });
  };
  const { left } = g.timer(now);
  useEffect(() => { if (left === 0) autoSave(); });
  useOnPhaseEnd(autoSave);

  return (
    <>
      <div className="box">
        <h2>Create your character</h2>
        <div className="m">this is all anyone else gets to see about you.</div>
        {C.fields.map(f => (
          <div key={f.key}>
            <label>{f.label}</label>
            {'multiline' in f && f.multiline
              ? <textarea maxLength={f.max} value={v[f.key]} onChange={e => setV({ ...v, [f.key]: e.target.value })} />
              : <input maxLength={f.max} value={v[f.key]} onChange={e => setV({ ...v, [f.key]: e.target.value })} />}
          </div>
        ))}
        <label>Profile picture</label>
        <div className="row">
          {img && <img className="av" src={img} alt="" style={{ width: 60, height: 60 }} />}
          <input type="file" accept="image/*" onChange={e => choose(e.target.files?.[0])} />
        </div>
        <ImageSearch onPick={choose} />
        <br /><br />
        <button onClick={save}>Save character</button> <span className="m">{ok}</span>
      </div>
      <div className="box"><h2>Ready</h2><Roster /></div>
    </>
  );
}
