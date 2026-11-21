'use client';
import { useState } from 'react';
import game from '@/config/game.json';
import { api } from '@/lib/store';

// Picked images are fetched through the backend's /proxy so they can be drawn to canvas.
// Source: Google Programmable Search (when game.json imageSearch.googleCx is set), else Openverse (no key).
const proxied = (u: string) => api('/proxy?u=' + encodeURIComponent(u));
const CX = game.imageSearch.googleCx;

async function openverse(q: string): Promise<string[]> {
  const d = await (await fetch(proxied('https://api.openverse.org/v1/images/?page_size=20&q=' + encodeURIComponent(q)))).json();
  return d.results.map((x: { thumbnail: string }) => x.thumbnail);
}

// Google's search element runs hidden; its `ready` callback hands us the results and returning true skips its own rendering.
type W = Window & { __gcse?: object; google?: any };
let gReady: Promise<void> | null = null, gResolve: ((l: string[]) => void) | null = null;
function loadGoogle() {
  return gReady ??= new Promise(res => {
    const w = window as W, div = document.createElement('div');
    div.id = 'gcse'; div.hidden = true; document.body.appendChild(div);
    w.__gcse = {
      parsetags: 'explicit',
      initializationCallback: () => {
        w.google.search.cse.element.render({ div: 'gcse', tag: 'searchresults-only', gname: 'ae', attributes: { searchType: 'image', disableWebSearch: true } });
        res();
      },
      searchCallbacks: {
        image: {
          ready: (_g: string, _q: string, _p: unknown, results?: { thumbnailImage?: { url: string } }[]) => {
            gResolve?.((results || []).map(r => r.thumbnailImage?.url).filter(Boolean) as string[]);
            return true;
          },
        },
      },
    };
    const s = document.createElement('script');
    s.src = 'https://cse.google.com/cse.js?cx=' + encodeURIComponent(CX);
    document.head.appendChild(s);
  });
}
async function google(q: string): Promise<string[]> {
  await loadGoogle();
  return new Promise((res, rej) => {
    gResolve = res;
    setTimeout(() => rej(new Error('timeout')), 15000);
    (window as W).google.search.cse.element.getElement('ae').execute(q);
  });
}

export function ImageSearch({ onPick }: { onPick: (b: Blob) => void }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const go = async () => {
    if (!q.trim()) return;
    setMsg('searching...'); setRes([]);
    try { const l = await (CX ? google : openverse)(q.trim()); setRes(l); setMsg(l.length ? '' : 'nothing found.'); }
    catch { setMsg('search failed, try again.'); }
  };
  const pick = async (u: string) => { setMsg('loading...'); try { onPick(await (await fetch(proxied(u))).blob()); setMsg('picked.'); } catch { setMsg('couldn’t load that one.'); } };
  return (
    <div>
      <div className="row" style={{ marginTop: 8 }}>
        <input placeholder="search for a picture" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
        <button className="o" onClick={go}>Search</button>
      </div>
      {msg && <div className="m" style={{ marginTop: 6 }}>{msg}</div>}
      {res.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', gap: 6, marginTop: 8 }}>
          {res.map(u => <img key={u} src={proxied(u)} alt="" onClick={() => pick(u)}
            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 14, cursor: 'pointer', background: '#fff' }} />)}
        </div>
      )}
    </div>
  );
}
