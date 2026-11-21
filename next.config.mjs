// Static export: `out/` is served by server.js locally and by the Cloudflare worker when deployed.
// In `next dev`, the game API is proxied to `PORT=3001 node server.js`.
// Built on Vercel (or with NEXT_PUBLIC_API_URL set), the client talks to the Cloudflare worker instead of its own origin.
const dev = process.env.NODE_ENV === 'development';
const env = { NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? (process.env.VERCEL ? 'https://alter-egos-party.thjmaurino.workers.dev' : '') };

export default dev
  ? { env, rewrites: async () => ['/events', '/set', '/reset', '/proxy'].map(p => ({ source: p, destination: 'http://localhost:3001' + p })) }
  : { env, output: 'export' };
