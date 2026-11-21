import game from '@/config/game.json';
import roundTypes from '@/config/rounds.json';
import { set, type Docs } from './store';

export type Phase = 'lobby' | 'create' | 'meet' | 'act' | 'review' | 'vote' | 'score' | 'perf' | 'perfvote' | 'end';
// plan: the round type key of every round this game, picked by the host when the game begins.
export interface State { phase: Phase; gen: number; round: number; t0: number; plan?: string[] }
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
export interface Card { title: string; subtitle: string; rules: string[] }
export interface RoundType {
  kind: 'text' | 'draw' | 'standup';
  big?: boolean;
  weight?: number;
  label: string;
  seconds: number;
  entries?: number;
  favorite?: boolean;
  card: Card;
  prompts: Prompt[];
  performance?: { seconds: number; card: Card };
}

export const RT = roundTypes as Record<string, RoundType>;
const DUR = game.durations as Partial<Record<Phase, number>>;
const SC = game.scoring;
const TIMED_SUBMIT: Phase[] = ['act', 'create'];

export const hash = (s: unknown) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const text = (p: Prompt) => typeof p === 'string' ? p : p.text;
const tag = (p: Prompt) => typeof p === 'string' ? undefined : p.tag;
const shuf = (a: Prompt[], salt: string) => [...a].sort((x, y) => hash(salt + text(x)) - hash(salt + text(y)));
export const fmtTime = (s: number) => s % 60 ? `${s} seconds` : s === 60 ? '1 minute' : `${s / 60} minutes`;
export const cardRules = (c: Card, seconds: number) => c.rules.map(r => r.replaceAll('{time}', fmtTime(seconds)));

// Big rounds (standup) open the game and come back every `bigRoundEvery` regular rounds.
// Regular rounds are weighted-random, avoiding the same type twice in a row when possible.
export function makePlan() {
  const keys = Object.keys(RT).filter(k => (RT[k].weight ?? 1) > 0);
  const big = keys.filter(k => RT[k].big), reg = keys.filter(k => !RT[k].big);
  const pick = (l: string[]) => {
    let x = Math.random() * l.reduce((s, k) => s + (RT[k].weight ?? 1), 0);
    return l.find(k => (x -= RT[k].weight ?? 1) < 0) ?? l[0];
  };
  const plan: string[] = [];
  let last = '';
  for (let i = 0; i < game.schedule.rounds; i++) {
    if (big.length && i % game.schedule.bigRoundEvery === 0) plan.push(pick(big));
    const opts = reg.filter(k => k !== last);
    plan.push(last = pick(opts.length ? opts : reg));
  }
  return plan;
}

let adv = ''; // last state this client advanced from, so the host never double-advances

// A snapshot of the room's docs from this player's point of view. Rebuilt on every change.
export class Game {
  S: State;
  P: Record<string, Player> = {};
  X: Record<string, any[]> = {};
  players: Player[];
  ids: string[];
  plan: string[];

  constructor(cache: Docs, public uid: string, public room: string) {
    this.S = cache['game/state'] ?? { phase: 'lobby', gen: 0, round: 0, t0: 0 };
    this.plan = this.S.plan || [];
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

  // ---------- rounds ----------
  rt(r = this.S.round) { return RT[this.plan[r]]; }
  // "round 2 of 4" counts regular rounds only; big rounds sit outside the count.
  roundNo(r = this.S.round) { return this.plan.slice(0, r + 1).filter(k => !RT[k].big).length; }
  get regularRounds() { return this.plan.filter(k => !RT[k].big).length; }
  // The latest round before r that left material to perform (a standup), or -1.
  perfSource(r = this.S.round) {
    for (let i = r - 1; i >= 0; i--) if (RT[this.plan[i]].performance) return i;
    return -1;
  }
  // A performance follows every regular round once a standup round has happened.
  hasPerf(r: number) { return !this.rt(r).performance && this.perfSource(r) >= 0; }
  perfNo(r = this.S.round) { let k = 0; for (let i = 0; i < r; i++) if (this.hasPerf(i)) k++; return k; }
  performer(r = this.S.round) { return this.ids[this.perfNo(r) % this.ids.length]; }

  // ---------- helpers ----------
  g<T = any>(n: string): T[] { return (this.X[n] || []).filter(d => d.gen === this.S.gen); }
  get me() { const p = this.P[this.uid]; return p && p.gen === this.S.gen ? p : null; }
  get isHost() { return this.players[0]?.id === this.uid; }
  others() { return this.players.filter(p => p.id !== this.uid); }
  cn(id: string) { return this.P[id]?.char?.name || 'Someone'; }
  assign(pid: string, r: number) {
    const l = this.ids, n = l.length;
    return n < 2 ? null : l[(l.indexOf(pid) + 1 + (r % (n - 1))) % n];
  }
  subOf(k: string, pid: string) { return this.g<Sub>('subs').find(d => d.key === k && d.from === pid); }
  curKey() { return 'r' + this.S.round; }
  myLike(): Like { return this.g<Like>('likes').find(d => d.r === this.S.round && d.from === this.uid) || { gen: this.S.gen, r: this.S.round, from: this.uid, items: [], fav: null }; }
  myVote() { return this.g<Vote>('votes').find(d => d.r === this.S.round && d.from === this.uid); }
  myPVote() { return this.g<PVote>('pvotes').find(d => d.r === this.S.round && d.from === this.uid); }

  // Walk the plan, giving each round the next unused prompt from its type's shuffled list.
  // Prompts sharing a tag with one already used are skipped (no "outfit" drawing after an "outfit" question).
  promptFor(r: number) {
    const usedText = new Set<string>(), usedTag = new Set<string>(), seen: Record<string, number> = {};
    let pick: Prompt = '';
    for (let i = 0; i <= r; i++) {
      const t = this.plan[i], l = shuf(RT[t].prompts, t + this.S.gen);
      seen[t] = (seen[t] ?? -1) + 1;
      pick = l.find(p => !usedText.has(text(p)) && !usedTag.has(tag(p)!)) ?? l[seen[t] % l.length];
      usedText.add(text(pick));
      if (tag(pick)) usedTag.add(tag(pick)!);
    }
    const a = this.assign(this.uid, r);
    return text(pick).replace('{P}', a ? this.cn(a) : 'another character');
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
    if (all) this.plan.forEach((_, rr) => {
      if (!this.hasPerf(rr) || this.performer(rr) !== pid) return;
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
  duration(): number | undefined {
    const { phase } = this.S;
    if (phase === 'act') return this.rt().seconds;
    if (phase === 'perf') return this.rt(this.perfSource()).performance!.seconds;
    return DUR[phase];
  }
  timer(now: number) {
    const d = this.duration(), el = (now - this.S.t0) / 1000;
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
    const n = { ...S, t0: Date.now() };
    const nextRound = () => { if (S.round < this.plan.length - 1) { n.round++; n.phase = 'act'; } else n.phase = 'end'; };
    if (S.phase === 'create') n.phase = 'meet';
    else if (S.phase === 'meet') { n.phase = 'act'; n.round = 0; }
    else if (S.phase === 'act') { if (this.rt().kind === 'standup') nextRound(); else n.phase = 'review'; }
    else if (S.phase === 'review') n.phase = 'vote';
    else if (S.phase === 'vote') n.phase = 'score';
    else if (S.phase === 'score') { if (this.hasPerf(S.round)) n.phase = 'perf'; else nextRound(); }
    else if (S.phase === 'perf') n.phase = 'perfvote';
    else if (S.phase === 'perfvote') nextRound();
    if (n.phase === 'act' || n.phase === 'perf') n.t0 = Date.now() + game.introCardSeconds * 1000;
    this.setState(n);
  }
  go(c: 'start' | 'begin' | 'skip' | 'new') {
    const S = this.S;
    if (c === 'start') this.setState({ ...S, phase: 'create', t0: Date.now() });
    if (c === 'begin') this.setState({ ...S, phase: 'meet', t0: Date.now(), plan: makePlan() });
    if (c === 'skip') { adv = ''; this.next(); }
    if (c === 'new') this.setState({ phase: 'lobby', gen: S.gen + 1, round: 0, t0: 0 });
  }
  // Host-only: advance when everyone is done or the timer (plus grace for auto-submits) runs out.
  hostTick(now: number) {
    if (!this.isHost) return;
    const S = this.S;
    if (S.phase === 'act' && this.players.every(p => this.subOf(this.curKey(), p.id))) return this.next();
    if (S.phase === 'perfvote' && this.players.filter(p => p.id !== this.performer())
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
