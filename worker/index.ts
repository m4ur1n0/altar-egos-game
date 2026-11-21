// Cloudflare backend: one Durable Object per room holds the docs and fans out updates over SSE.
// Same protocol as server.js. Static files (the Next export in out/) are served by Workers Assets.
import { DurableObject } from 'cloudflare:workers';

interface Env { ROOM: DurableObjectNamespace<Room>; ASSETS: Fetcher }

const enc = new TextEncoder();
const msg = (o: unknown) => enc.encode('data:' + JSON.stringify(o) + '\n\n');

export class Room extends DurableObject<Env> {
  docs: Record<string, unknown> | null = null;
  clients = new Set<WritableStreamDefaultWriter>();
  ping?: ReturnType<typeof setInterval>;

  // Docs persist in storage, so a room survives redeploys and the object going idle.
  async load() { return this.docs ??= Object.fromEntries(await this.ctx.storage.list()); }

  write(w: WritableStreamDefaultWriter, b: Uint8Array) { w.write(b).catch(() => this.clients.delete(w)); }
  send(o: unknown) { const b = msg(o); this.clients.forEach(w => this.write(w, b)); }

  async fetch(req: Request) {
    const u = new URL(req.url), docs = await this.load();
    if (u.pathname === '/events') {
      const { readable, writable } = new TransformStream();
      const w = writable.getWriter();
      this.write(w, msg({ t: 'init', docs }));
      this.clients.add(w);
      this.ping ??= setInterval(() => { const b = enc.encode(': ping\n\n'); this.clients.forEach(c => this.write(c, b)); }, 20000);
      return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' } });
    }
    if (u.pathname === '/set') {
      const m = await req.json<{ path: string; data: unknown; by: string }>();
      if (typeof m.path === 'string' && m.path.length < 200) {
        docs[m.path] = m.data;
        this.ctx.storage.put(m.path, m.data);
        this.send({ t: 'set', path: m.path, data: m.data, by: m.by });
      }
      return new Response('ok');
    }
    // /reset
    this.docs = {};
    await this.ctx.storage.deleteAll();
    this.send({ t: 'init', docs: this.docs });
    return new Response('reset');
  }
}

export default {
  async fetch(req: Request, env: Env) {
    const u = new URL(req.url);
    let room = u.searchParams.get('room');
    if (u.pathname === '/set' && req.method === 'POST') {
      const body = await req.text();
      room = JSON.parse(body).room;
      req = new Request(req.url, { method: 'POST', body });
    } else if (u.pathname !== '/events' && u.pathname !== '/reset') return env.ASSETS.fetch(req);
    return env.ROOM.get(env.ROOM.idFromName(room || 'main')).fetch(req);
  },
};
