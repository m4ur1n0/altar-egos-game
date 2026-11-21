// Static export: `out/` is served by server.js locally and by the Cloudflare worker when deployed.
// In `next dev`, the game API is proxied to `PORT=3001 node server.js`.
const dev = process.env.NODE_ENV === 'development';

export default dev
  ? { rewrites: async () => ['/events', '/set', '/reset'].map(p => ({ source: p, destination: 'http://localhost:3001' + p })) }
  : { output: 'export' };
