'use client';
import { useState } from 'react';

// Image search through the backend's /proxy (same-origin, so picked images can be drawn to canvas).
// Source: Openverse (no API key). To change source, change `search` and the PROXY_OK list in server.js + worker.
const proxied = (u: string) => '/proxy?u=' + encodeURIComponent(u);

async function search(q: string): Promise<string[]> {
  const r = await fetch(proxied('https://api.openverse.org/v1/images/?page_size=20&q=' + encodeURIComponent(q)));
  const d = await r.json();
  return d.results.map((x: { thumbnail: string }) => x.thumbnail);
}

export function ImageSearch({ onPick }: { onPick: (b: Blob) => void }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const go = async () => {
    if (!q.trim()) return;
    setMsg('searching...'); setRes([]);
    try { const l = await search(q.trim()); setRes(l); setMsg(l.length ? '' : 'nothing found.'); }
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
