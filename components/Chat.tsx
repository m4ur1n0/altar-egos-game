'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import game from '@/config/game.json';
import { useGame } from '@/lib/context';
import { pend, send } from '@/lib/chat';
import type { Msg } from '@/lib/game';
import { Avatar } from './Character';

export function Feed({ ch, id }: { ch: string; id?: string }) {
  const { g, now } = useGame();
  const el = useRef<HTMLDivElement>(null), stick = useRef(true);
  const vis = (m: Msg) => m.gen === g.S.gen && m.ch === ch && (m.to === 'all' || m.from === g.uid || m.to === g.uid);
  const list = [
    ...g.X.msgs?.filter(vis) || [],
    ...pend.filter(p => p.ch === ch && p.gen === g.S.gen).map(p => ({ ...p, t: p.ct, wait: Math.ceil((p.at - now) / 1000) })),
  ].sort((a, b) => a.t - b.t) as (Msg & { wait?: number })[];
  const sig = list.map(m => m.t + ':' + m.wait).join();
  useLayoutEffect(() => { if (stick.current && el.current) el.current.scrollTop = el.current.scrollHeight; }, [sig]);

  return (
    <div id={id} className="feed" ref={el}
      onScroll={e => { const t = e.currentTarget; stick.current = t.scrollHeight - t.scrollTop - t.clientHeight < 60; }}>
      {list.length ? list.map((m, i) => {
        const me = m.from === g.uid, dm = m.to !== 'all', w = (m.wait ?? 0) > 0;
        return (
          <div key={i} className={'msg' + (me ? ' me' : '')}>
            {!me && <Avatar id={m.from} />}
            <div className="bw">
              <div className="nm">{me ? 'You' : g.cn(m.from)}{dm ? ' · direct' + (m.to === g.uid ? ' to you' : ' to ' + g.cn(m.to)) : ''}</div>
              <div className={'bub' + (dm ? ' dm' : '') + (w ? ' pd2' : '')}>{m.text}</div>
              {w && <div className="st">sends in {m.wait}s</div>}
            </div>
          </div>
        );
      }) : <div className="m">No messages yet.</div>}
    </div>
  );
}

// Text input + send button. `to` is 'all' unless a direct-message target is picked.
export function ChatInput({ ch, id, placeholder, to = 'all', children }: { ch: string; id: string; placeholder: string; to?: string; children?: React.ReactNode }) {
  const { g } = useGame();
  const [text, setText] = useState('');
  const go = () => { const t = text.trim(); if (!t) return; setText(''); send(g, ch, to, t); };
  return (
    <div className="row">
      {children}
      <input id={id} maxLength={game.chat.maxLength} placeholder={placeholder} value={text}
        onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
      <button onClick={go}>Send</button>
    </div>
  );
}

export function MainChat() {
  const { g } = useGame();
  const [to, setTo] = useState('all');
  const targets = g.others().filter(p => p.char);
  const val = targets.some(p => p.id === to) ? to : 'all';
  return (
    <div id="p-chat" className="box">
      <h2>Chat</h2>
      <div className="m" style={{ marginBottom: 6 }}>Messages to everyone arrive after a random delay (up to {game.chat.mainMaxDelaySeconds}s), in the order you sent them. Direct messages are immediate.</div>
      <Feed ch="main" id="msgs" />
      <ChatInput ch="main" id="ci" placeholder="Message" to={val}>
        <select style={{ maxWidth: '42%' }} value={val} onChange={e => setTo(e.target.value)}>
          <option value="all">Everyone (delayed)</option>
          {targets.map(p => <option key={p.id} value={p.id}>Direct: {p.char!.name}</option>)}
        </select>
      </ChatInput>
    </div>
  );
}
