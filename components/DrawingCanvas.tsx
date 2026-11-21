'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import game from '@/config/game.json';

const D = game.drawing;

export const DrawingCanvas = forwardRef<HTMLCanvasElement | null, { locked: boolean }>(function DrawingCanvas({ locked }, ref) {
  const cv = useRef<HTMLCanvasElement>(null);
  const pen = useRef({ col: '#000000', w: D.thin, er: false, down: false });
  useImperativeHandle(ref, () => cv.current!);
  const ctx = () => cv.current!.getContext('2d')!;
  const clear = () => { const x = ctx(); x.fillStyle = '#fff'; x.fillRect(0, 0, D.width, D.height); };
  const apply = () => { const x = ctx(), p = pen.current; x.strokeStyle = p.er ? '#fff' : p.col; x.lineWidth = p.er ? D.eraser : p.w; };
  useEffect(() => { clear(); const x = ctx(); x.lineCap = x.lineJoin = 'round'; apply(); }, []);

  const pt = (e: React.PointerEvent) => {
    const r = cv.current!.getBoundingClientRect();
    return [(e.clientX - r.left) * D.width / r.width, (e.clientY - r.top) * D.height / r.height];
  };
  const set = (p: Partial<typeof pen.current>) => { Object.assign(pen.current, p); apply(); };

  return (
    <>
      <canvas ref={cv} id="cv" width={D.width} height={D.height} style={{ pointerEvents: locked ? 'none' : undefined }}
        onPointerDown={e => { pen.current.down = true; cv.current!.setPointerCapture(e.pointerId); const [a, b] = pt(e), x = ctx(); x.beginPath(); x.moveTo(a, b); x.lineTo(a + 0.1, b); x.stroke(); }}
        onPointerMove={e => { if (!pen.current.down) return; const [a, b] = pt(e), x = ctx(); x.lineTo(a, b); x.stroke(); }}
        onPointerUp={() => { pen.current.down = false; }}
        onPointerCancel={() => { pen.current.down = false; }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {D.colors.map(c => <button key={c} className="sw" style={{ background: c }} onClick={() => set({ col: c, er: false })} />)}
      </div>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="o" onClick={() => set({ w: D.thin, er: false })}>Thin</button>
        <button className="o" onClick={() => set({ w: D.thick, er: false })}>Thick</button>
        <button className="o" onClick={() => set({ er: true })}>Erase</button>
        <button className="o" onClick={clear}>Clear</button>
      </div>
    </>
  );
});
