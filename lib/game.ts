import game from '@/config/game.json';
import roundTypes from '@/config/rounds.json';
import { set, type Docs } from './store';

export type Phase = 'lobby' | 'create' | 'meet' | 'joke' | 'act' | 'review' | 'vote' | 'score' | 'perf' | 'perfvote' | 'end';
export interface State { phase: Phase; gen: number; round: number; t0: number }
export type Character = Record<string, string>;
export interface Player { id: string; gen: number; joined: number; real: string; char: Character | null }
export interface Sub { gen: number; key: string; from: string; kind: 'text' | 'draw' | 'jokes'; data: any }
export interface Like { gen: number; r: number; from: string; items: string[]; fav: string | null }
export interface Vote { gen: number; r: number; from: string; guesses: Record<string, string> }
export interface PVote { gen: number; r: number; from: string; up: boolean }
export interface Boon { gen: number; r: number; from: string; kind: string; target: string | null; guess: string | null }
export interface Note { id: string; gen: number; text: string }
export interface Msg { gen: number; ch: string; from: string; to: string; text: string; t: number }

type Prompt = string | { text: string; tag?: string };
export interface RoundType { kind: 'text' | 'draw'; label: string; favorite: boolean; card: Card; prompts: Prompt[] }
export interface Card { title: string; subtitle: string; rules: string[] }

export const ROUNDS = game.rounds;
export const RT = roundTypes as Record<string, RoundType>;
export const roundType = (r: number) => RT[ROUNDS[r]];
export const DUR = game.durations as Partial<Record<Phase, number>>;
const SC = game.scoring;
const TIMED_SUBMIT: Phase[] = ['joke', 'act', 'create'];

export const hash = (s: unknown) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const text = (p: Prompt) => typeof p === 'string' ? p : p.text;
const tag = (p: Prompt) => typeof p === 'string' ? undefined : p.tag;
const shuf = (a: Prompt[], salt: string) => [...a].sort((x, y) => hash(salt + text(x)) - hash(salt + text(y)));

let adv = ''; // last state this client advanced from, so the host never double-advances

// A snapshot of the room's docs from this player's point of view. Rebuilt on every change.
export class Game {
  S: State;
  P: Record<string, Player> = {};
  X: Record<string, any[]> = {};
  players: Player[];
  ids: string[];

  constructor(cache: Docs, public uid: string, public room: string) {
    this.S = cache['game/state'] ?? { phase: 'lobby', gen: 0, round: 0, t0: 0 };
    for (const k in cache) {
      const [col, id, extra] = k.split('/');
      if (!id || extra !== undefined) continue;
      if (col === 'players') this.P[id] = { id, ...cache[k] };
      else (this.X[col] ??= []).push({ id, ...cache[k] });
    }
    this.players = Object.values(this.P).filter(p => p.gen === this.S.gen)
      .sort((a, b) => a.joined - b.joined || (a.id < b.id ? -1 : 1));
    this.ids = this.players.map(p => p.id).sort((a, b) => hash(this.S.gen + a) - hash(this.S.gen + b));
  }

  // ---------- helpers ----------
  g<T = any>(n: string): T[] { return (this.X[n] || []).filter(d => d.gen === this.S.gen); }
  get me() { const p = this.P[this.uid]; return p && p.gen === this.S.gen ? p : null; }
  get isHost() { return this.players[0]?.id === this.uid; }
  others() { return this.players.filter(p => p.id !== this.uid); }
  cn(id: string) { return this.P[id]?.char?.name || 'Someone'; }
  performer(r: number) { return this.ids[r % this.ids.length]; }
  assign(pid: string, r: number) {
    const l = this.ids, n = l.length;
    return n < 2 ? null : l[(l.indexOf(pid) + 1 + (r % (n - 1))) % n];
  }
  subOf(k: string, pid: string) { return this.g<Sub>('subs').find(d => d.key === k && d.from === pid); }
  curKey() { return this.S.phase === 'joke' ? 'joke' : 'r' + this.S.round; }
  myLike(): Like { return this.g<Like>('likes').find(d => d.r === this.S.round && d.from === this.uid) || { gen: this.S.gen, r: this.S.round, from: this.uid, items: [], fav: null }; }
  myVote() { return this.g<Vote>('votes').find(d => d.r === this.S.round && d.from === this.uid); }
  myPVote() { return this.g<PVote>('pvotes').find(d => d.r === this.S.round && d.from === this.uid); }

  // Each round type draws prompts from its own shuffled list. Prompts sharing a tag with one already
  // used by an earlier round type this game are skipped (e.g. no "outfit" drawing after an "outfit" question).
  promptFor(r: number) {
    const type = ROUNDS[r], used = new Set<string>();
    let list: Prompt[] = [];
    for (const t of new Set(ROUNDS)) {
      const l = shuf(RT[t].prompts.filter(p => !used.has(tag(p)!)), t + this.S.gen);
      if (t === type) { list = l; break; }
      l.slice(0, ROUNDS.filter(k => k === t).length).forEach(p => tag(p) && used.add(tag(p)!));
    }
    const a = this.assign(this.uid, r);
    return text(list[ROUNDS.slice(0, r).filter(k => k === type).length % list.length])
      .replace('{P}', a ? this.cn(a) : 'another character');
  }

  // ---------- scoring ----------
  tally(pid: string, r?: number) {
    const all = r === undefined, ok = (d: { r: number }) => all || d.r === r;
    const likes = this.g<Like>('likes').filter(ok);
    const L = likes.filter(d => d.items.includes(pid)).length, F = likes.filter(d => d.fav === pid).length;
    let by = 0, hit = 0, perf = 0, take = 0;
    this.g<Vote>('votes').filter(ok).forEach(v => {
      if (v.from === pid) hit += Object.entries(v.guesses).filter(([t, x]) => x === t).length;
      else if (v.guesses[pid] === pid) by++;
    });
    this.g<Boon>('boons').filter(ok).forEach(b => {
      if (b.kind === 'take') { if (b.from === pid) take++; if (b.target === pid) take--; }
    });
    if (all) ROUNDS.forEach((_, rr) => {
      if (this.performer(rr) !== pid) return;
      const v = this.g<PVote>('pvotes').filter(d => d.r === rr);
      if (v.length && v.filter(d => d.up).length > v.length / 2) perf++;
    });
    return { L, F, by, hit, perf, take, t: L * SC.like + F * SC.favorite + by * SC.guessedBy + hit * SC.correctGuess + perf * SC.performance + take * SC.takePoint };
  }
  total(pid: string) {
    let t = this.tally(pid).t;
    if (this.S.phase === 'end') {
      const v = this.g<PVote>('pvotes').filter(d => d.from === pid);
      if (v.length && v.filter(d => !d.up).length / v.length > SC.thumbsDownThreshold) t += SC.thumbsDownPenalty;
    }
    return t;
  }
  ranked() { return this.players.map(p => ({ p, t: this.total(p.id) })).sort((a, b) => b.t - a.t); }
  winners(r: number) {
    const c: Record<string, number> = {};
    this.players.forEach(p => { const x = this.tally(p.id, r); c[p.id] = x.L + x.F; });
    const mx = Math.max(0, ...Object.values(c));
    return mx ? Object.keys(c).filter(k => c[k] === mx) : [];
  }

  // ---------- timing ----------
  timer(now: number) {
    const d = DUR[this.S.phase], el = (now - this.S.t0) / 1000;
    return { d, el, left: d ? Math.max(0, Math.ceil(d - el)) : 0 };
  }

  // ---------- writes ----------
  save(patch: Partial<Player>) { const { id, ...cur } = { ...this.P[this.uid], ...patch }; set('players/' + this.uid, cur); }
  setState(n: State) { set('game/state', n); }
  join(real: string) { this.save({ gen: this.S.gen, joined: Date.now(), real, char: null }); }

  next() {
    const S = this.S, key = [S.gen, S.phase, S.round].join();
    if (adv === key) return;
    adv = key;
    const n = { ...S, t0: Date.now() }, o: Phase[] = ['joke', 'act', 'review', 'vote', 'score', 'perf', 'perfvote'];
    if (S.phase === 'create') n.phase = 'meet';
    else if (S.phase === 'meet') n.phase = 'joke';
    else if (S.phase === 'joke') { n.phase = 'act'; n.round = 0; }
    else if (S.phase === 'perfvote') { if (S.round < ROUNDS.length - 1) { n.round++; n.phase = 'act'; } else n.phase = 'end'; }
    else n.phase = o[o.indexOf(S.phase) + 1];
    if (['joke', 'act', 'perf'].includes(n.phase)) n.t0 = Date.now() + game.introCardSeconds * 1000;
    this.setState(n);
  }
  go(c: 'start' | 'begin' | 'skip' | 'new') {
    const S = this.S;
    if (c === 'start') this.setState({ ...S, phase: 'create', t0: Date.now() });
    if (c === 'begin') this.setState({ ...S, phase: 'meet', t0: Date.now() });
    if (c === 'skip') { adv = ''; this.next(); }
    if (c === 'new') this.setState({ phase: 'lobby', gen: S.gen + 1, round: 0, t0: 0 });
  }
  // Host-only: advance when everyone is done or the timer (plus grace for auto-submits) runs out.
  hostTick(now: number) {
    if (!this.isHost) return;
    const S = this.S;
    if ((S.phase === 'joke' || S.phase === 'act') && this.players.every(p => this.subOf(this.curKey(), p.id))) return this.next();
    if (S.phase === 'perfvote' && this.players.filter(p => p.id !== this.performer(S.round))
      .every(p => this.g<PVote>('pvotes').some(d => d.r === S.round && d.from === p.id))) return this.next();
    const { d, el, left } = this.timer(now);
    if (d && left === 0 && el >= d + (TIMED_SUBMIT.includes(S.phase) ? game.autoAdvanceGraceSeconds : 0)) this.next();
  }

  submit(kind: Sub['kind'], data: unknown) {
    const key = this.curKey();
    if (this.subOf(key, this.uid)) return;
    set(`subs/${this.S.gen}_${key}_${this.uid}`, { gen: this.S.gen, key, from: this.uid, kind, data });
  }
  like(a: string) {
    const c = this.myLike();
    set(`likes/${this.S.gen}_${this.S.round}_${this.uid}`, { ...c, items: c.items.includes(a) ? c.items.filter(x => x !== a) : [...c.items, a] });
  }
  setFav(a: string) {
    const c = this.myLike();
    set(`likes/${this.S.gen}_${this.S.round}_${this.uid}`, { ...c, fav: c.fav === a ? null : a });
  }
  guess(target: string, who: string) {
    const guesses = { ...this.myVote()?.guesses };
    if (who) guesses[target] = who; else delete guesses[target];
    set(`votes/${this.S.gen}_${this.S.round}_${this.uid}`, { gen: this.S.gen, r: this.S.round, from: this.uid, guesses });
  }
  pvote(up: boolean) { set(`pvotes/${this.S.gen}_${this.S.round}_${this.uid}`, { gen: this.S.gen, r: this.S.round, from: this.uid, up }); }
  pickBoon(kind: string, target: string | null, guess: string | null) {
    set(`boons/${this.S.gen}_${this.S.round}_${this.uid}`, { gen: this.S.gen, r: this.S.round, from: this.uid, kind, target, guess });
  }
  saveNote(text: string) { set('notes/' + this.uid, { gen: this.S.gen, text }); }
}
