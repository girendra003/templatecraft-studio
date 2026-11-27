import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Icon } from './Icon';
export function DocumentDemo() {
  const [position, setPosition] = useState({ x: 8, y: 35 });
  const [motion, setMotion] = useState(true);
  const [riffle, setRiffle] = useState(0);
  const [signed, setSigned] = useState(false);
  const [filled, setFilled] = useState(false);
  const [reveal, setReveal] = useState(100);
  const scene = useRef<HTMLElement>(null);
  const [interacting, setInteracting] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const stack = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    let visible = false;
    const update = () => { element.dataset.running = String(visible && !window.document.hidden); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting && entry.intersectionRatio >= .1; update(); }, { threshold: .1 });
    observer.observe(element); window.document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); window.document.removeEventListener('visibilitychange', update); };
  }, []);
  const resetTilt = () => { cancelAnimationFrame(frame.current); if (stack.current) stack.current.style.transform = ''; };
  return <section ref={scene} data-interacting={interacting} data-motion={motion} className="document-demo" aria-label="Interactive form demonstration">
    <div className="demo-topline"><span><i/> INTERACTIVE PLAYGROUND</span><div className="demo-motion-controls"><button className="motion-toggle" aria-label="Animate 3D preview" aria-pressed={motion} onClick={() => { setMotion(!motion); resetTilt(); }}>{motion ? 'Ⅱ Pause' : '▶ Play'}</button><button className="riffle-replay" onClick={() => { setMotion(true); setRiffle((value) => value + 1); }} title="Replay the paper shuffle">↻ Riffle pages</button></div></div>
    <div className="demo-stage" onPointerMove={(event) => {
      if (!motion || event.pointerType !== 'mouse' || drag.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if ((event.target as HTMLElement).closest('button,input,.demo-page')) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const rx = ((event.clientY - rect.top) / rect.height - .5) * -8;
      const ry = ((event.clientX - rect.left) / rect.width - .5) * 12;
      cancelAnimationFrame(frame.current); frame.current = requestAnimationFrame(() => { if (stack.current) stack.current.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; });
    }} onPointerLeave={resetTilt}>
      <div className="depth-tool text-tool" aria-hidden="true"><b>Aa</b><span>Text fields</span><i/></div><div className="depth-tool sign-tool" aria-hidden="true"><Icon name="sign" size={27}/><span>Signatures</span><i/></div>
      <div className="demo-orbit orbit-one"/><div className="demo-orbit orbit-two"/>
      <div className="document-stack" ref={stack}><div className="document-float">
        <div className="riffle-deck" aria-hidden="true" key={riffle}>{Array.from({ length: 6 }, (_, index) => <div className="riffle-sheet" key={index} style={{ '--sheet': index } as CSSProperties}><span className="riffle-page-number">0{index + 2}</span><span className="riffle-page-mark"/><i/><i/><i/><div><span/><span/></div><i/></div>)}</div>
        <div className="demo-page" ref={sheet}>
          <div className="demo-letterhead"><span><Icon name="document" size={20}/> TEMPLATECRAFT</span><small>FORM / 001</small></div>
          <h2>Client details & consent</h2><p className="demo-subtitle">A better form starts here.</p>
          <div className="demo-rule"/><div className="demo-static-label label-name">FULL NAME</div><div className="demo-static-label label-email">EMAIL ADDRESS</div>
          <div className="demo-static-line line-name"/><div className="demo-static-line line-email"/>
          <div className="demo-skeleton"><span/><span/><span/></div><div className="demo-static-label label-sign">APPLICANT SIGNATURE</div><div className="demo-static-line line-sign"/>
          <div className="demo-edit-layer" style={{ clipPath: `inset(0 ${100 - reveal}% 0 0)` }}>
            <button className={`demo-field${filled ? ' is-filled' : ''}`} style={{ left: `${position.x}%`, top: `${position.y}%` }} aria-label="Move demo name field" title="Drag this field, or use the arrow keys" disabled={filled}
              onPointerDown={(event) => { event.preventDefault(); setInteracting(true); resetTilt(); drag.current = { x: event.clientX, y: event.clientY, left: position.x, top: position.y }; event.currentTarget.setPointerCapture(event.pointerId); }}
              onPointerMove={(event) => { if (!drag.current || !sheet.current) return; const bounds = sheet.current.getBoundingClientRect(); setPosition({ x: Math.max(3, Math.min(49, drag.current.left + (event.clientX - drag.current.x) / bounds.width * 100)), y: Math.max(24, Math.min(70, drag.current.top + (event.clientY - drag.current.y) / bounds.height * 100)) }); }}
              onPointerUp={() => { drag.current = null; setInteracting(false); }} onPointerCancel={() => { drag.current = null; setInteracting(false); }}
              onKeyDown={(event) => { if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return; event.preventDefault(); setPosition((p) => ({ x: Math.max(3, Math.min(49, p.x + (event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0))), y: Math.max(24, Math.min(70, p.y + (event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0))) })); }}>
              {!filled && <small>TEXT FIELD</small>}{filled ? 'Alex Morgan' : '↔ Drag this field'}{!filled && <><i/><i/><i/><i/></>}
            </button>
            {filled && <span className="demo-email">alex@example.com</span>}
            {signed && <svg className="demo-signature" viewBox="0 0 160 48" aria-label="Example signature"><path d="M8 36C26 2 42 0 27 31S13 41 47 25C61 16 58 37 70 28S82 14 83 27S96 35 106 22S110 31 123 25L146 18M26 42L142 35" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>}
          </div>
          {reveal > 0 && reveal < 100 && <div className="demo-comparison-line" style={{ left: `${reveal}%` }}><span>↔</span></div>}
          <div className="demo-page-footer"><span>Prepared for possibility.</span><b>01 / 01</b></div>
        </div>
      </div>
      </div><span className="demo-depth-chip" aria-hidden="true"><Icon name="fields" size={13}/> Precision, in every layer</span>
      <div className="demo-floating-badge"><Icon name="check" size={14}/>{filled ? 'Preview ready' : signed ? 'Signature placed' : 'Your form. Your rules.'}</div>
    </div>
    <div className="demo-controls"><button className={`button${signed ? ' demo-on' : ''}`} aria-pressed={signed} onClick={() => { setSigned(!signed); setReveal(100); }}><Icon name="sign" size={14}/>{signed ? 'Remove signature' : 'Add signature'}</button><button className={`button${filled ? ' demo-on' : ''}`} aria-pressed={filled} onClick={() => { setFilled(!filled); setReveal(100); }}><Icon name="test" size={13}/>{filled ? 'Edit fields' : 'Preview fill'}</button><button className="button demo-reset" onClick={() => { setPosition({ x: 8, y: 35 }); setSigned(false); setFilled(false); setReveal(100); resetTilt(); }}>Reset</button></div>
    <label className="demo-comparison"><span>Original</span><input type="range" min="0" max="100" value={reveal} aria-label="Compare original and edited form" onChange={(event) => setReveal(Number(event.target.value))}/><span>Edited</span></label>
    <p className="demo-hint" role="status">{filled ? 'Example values only. Open a PDF to fill your own form.' : 'Try dragging the highlighted field. Arrow keys work too.'}</p>
  </section>;
}
