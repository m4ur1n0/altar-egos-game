import game from '@/config/game.json';
import { add } from './store';
import type { Game, Msg } from './game';

// Messages to everyone wait locally for a delay, then post. Kept per tab, like the original.
export type Pending = Msg & { at: number; ct: number };
export let pend: Pending[] = [];
const lastAt: Record<string, number> = {};
let seq = 0;
const C = game.chat;

export function send(g: Game, ch: string, to: string, text: string) {
  const now = Date.now(), isMain = ch === 'main';
  let at = now + (to !== 'all' ? 0 : isMain ? Math.random() * C.mainMaxDelaySeconds * 1000 : C.perfDelaySeconds * 1000);
  if (to === 'all') { at = Math.max(at, (lastAt[ch] || 0) + C.minGapMs); lastAt[ch] = at; }
  pend.push({ gen: g.S.gen, ch, from: g.uid, to, text: text.slice(0, C.maxLength), t: now, at, ct: now });
  flush();
}

export function flush() {
  const now = Date.now();
  pend = pend.filter(p => {
    if (p.at > now) return true;
    const { at, ct, ...m } = p;
    add('msgs', { ...m, t: now + (seq++) / 1000 });
    return false;
  });
}
