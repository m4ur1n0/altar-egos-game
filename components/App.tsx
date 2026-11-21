'use client';
import { useEffect, useRef, useState } from 'react';
import game from '@/config/game.json';
import { flush } from '@/lib/chat';
import { GameCtx } from '@/lib/context';
import { Game, type Phase } from '@/lib/game';
import { room, uid, useStore } from '@/lib/store';
import { MainChat } from './Chat';
import { Background, HostControls, IntroCard, Notebook, Profiles } from './Panels';
import { Act } from './phases/Act';
import { Create } from './phases/Create';
import { Join, Lobby } from './phases/Join';
import { Meet } from './phases/Meet';
import { End, Perf, PerfVote } from './phases/Perf';
import { Review } from './phases/Review';
import { Score } from './phases/Score';
import { Vote } from './phases/Vote';

const STAGES: Record<Phase, () => React.ReactNode> = {
  lobby: Lobby, create: Create, meet: Meet, act: Act, review: Review,
  vote: Vote, score: Score, perf: Perf, perfvote: PerfVote, end: End,
};
const TABS = { game: 'GAME', prof: 'PROFILES', notes: 'NOTES' };
const LBL = game.labels as Record<Phase, string>;

export default function App() {
  const { cache, loaded, failed } = useStore();
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState<keyof typeof TABS>('game');
  const rejoin = useRef(false);
  useEffect(() => { const i = setInterval(() => { flush(); setNow(Date.now()); }, 500); return () => clearInterval(i); }, []);

  const g = new Game(cache, uid, room), { S } = g, me = g.me;

  useEffect(() => {
    if (!loaded) return;
    // Players left over from the previous game rejoin the new one automatically.
    const m = g.P[uid];
    if (m && m.gen !== S.gen) { if (!rejoin.current) { rejoin.current = true; g.save({ gen: S.gen, joined: Date.now(), char: null }); } }
    else rejoin.current = false;
    g.hostTick(now);
  });

  const inGame = !!me && !['lobby', 'create'].includes(S.phase);
  const curTab = inGame ? tab : 'game';
  const { d, el, left } = g.timer(now);
  const timer = !d ? LBL[S.phase] : el < 0 ? 'starting' : `${LBL[S.phase]}  ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  const Stage = STAGES[S.phase];

  return (
    <GameCtx.Provider value={{ g, now }}>
      <Background />
      <div className="w">
        <header><span>{game.title}</span><span id="timer">{loaded ? timer : ''}</span></header>
        {inGame && (
          <nav>{Object.entries(TABS).map(([t, l]) => <button key={t} className={curTab === t ? 'on' : ''} onClick={() => setTab(t as typeof tab)}>{l}</button>)}</nav>
        )}
        <div id="L">
          <div id="main">
            <div hidden={curTab !== 'game'}>
              {!loaded ? <div className="box m">{failed ? 'can’t reach the game server. is it running?' : 'connecting...'}</div>
                : !me ? <Join />
                : <Stage key={[S.gen, S.phase, S.round].join()} />}
              <HostControls />
            </div>
            {curTab === 'prof' && <Profiles />}
            {me && <Notebook hidden={curTab !== 'notes'} />}
          </div>
          {inGame && <MainChat />}
        </div>
        <IntroCard />
      </div>
    </GameCtx.Provider>
  );
}
