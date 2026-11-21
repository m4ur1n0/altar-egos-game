'use client';
// Shared key-value store synced over SSE. Same protocol for server.js (local) and the Cloudflare worker (deployed):
//   GET /events?room=x  -> stream of {t:'init',docs} | {t:'set',path,data,by}
//   POST /set           -> {room,path,data,by}
import { useSyncExternalStore } from 'react';

export type Docs = Record<string, any>;

// '' = same origin (server.js, or the worker serving the site). Set by next.config.mjs.
export const api = (path: string) => (process.env.NEXT_PUBLIC_API_URL || '') + path;
const rid = () => Math.random().toString(36).slice(2, 10);
const cid = rid();
const subs = new Set<() => void>();
let cache: Docs = {}, loaded = false, failed = false, version = 0, started = false;
export let room = 'main', uid = '';

const bump = () => { version++; subs.forEach(f => f()); };

function connect() {
  if (started) return;
  started = true;
  const sp = new URLSearchParams(location.search);
  room = (sp.get('room') || '').replace(/[^\w-]/g, '').slice(0, 40) || 'main';
  let id = (sp.get('u') || '').replace(/[^\w-]/g, '');
  try { id = id || localStorage.getItem('ae_uid') || ''; if (!id) { id = 'p' + rid(); localStorage.setItem('ae_uid', id); } }
  catch { id = id || 'p' + rid(); }
  uid = id;
  const es = new EventSource(api('/events?room=' + room));
  es.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.t === 'init') { cache = m.docs; loaded = true; failed = false; }
    else if (m.by !== cid) cache[m.path] = m.data;
    else return;
    bump();
  };
  es.onerror = () => { if (!loaded) { failed = true; bump(); } };
}

export function set(path: string, data: unknown) {
  cache[path] = data;
  bump();
  fetch(api('/set'), { method: 'POST', body: JSON.stringify({ room, path, data, by: cid }) }).catch(() => {});
}

export const add = (col: string, data: unknown) => set(col + '/' + rid() + Date.now().toString(36), data);

const subscribe = (f: () => void) => { connect(); subs.add(f); return () => { subs.delete(f); }; };

export function useStore() {
  useSyncExternalStore(subscribe, () => version, () => -1);
  return { cache, loaded, failed };
}
