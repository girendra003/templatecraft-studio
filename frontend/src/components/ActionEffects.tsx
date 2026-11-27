import type { CSSProperties } from 'react';
import { Icon } from './Icon';
export interface ActionFlash { id: number; kind: 'upload' | 'download'; label: string; }
export function ActionEffects({ flash }: { flash: ActionFlash | null }) {
  if (!flash) return null;
  return <div key={flash.id} className={`action-celebration ${flash.kind}`} role="status" aria-live="polite">
    <div className="action-sparkles" aria-hidden="true">{Array.from({length:14},(_,i)=><i key={i} style={{'--dx':`${Math.cos(i/14*Math.PI*2)*100}px`,'--dy':`${Math.sin(i/14*Math.PI*2)*65}px`,'--turn':`${i*47}deg`,'--delay':`${i%3*35}ms`} as CSSProperties}/>)}</div>
    <span className="action-ring" aria-hidden="true"/><span className="action-medallion"><Icon name={flash.kind === 'upload' ? 'check' : 'export'} size={23}/></span>
    <div><b>{flash.kind === 'upload' ? 'Ready to create' : 'Your export is ready'}</b><small>{flash.label}</small></div>
  </div>;
}
export function OperationLoader({ label, downloading }: { label: string; downloading: boolean }) {
  return <div className="operation-loader" role="status" aria-live="polite"><div className="operation-card">
    <div className="operation-visual" aria-hidden="true"><span className="operation-halo"/><div className="operation-paper paper-back"/><div className="operation-paper"><Icon name="document" size={28}/><i/><i/><i/><span className="operation-scan"/></div><span className="operation-arrow"><Icon name={downloading ? 'export' : 'upload'} size={19}/></span></div>
    <span className="eyebrow">{downloading ? 'PACKAGING YOUR WORK' : 'A NEW CANVAS AWAITS'}</span><h2>{downloading ? 'Preparing your export…' : 'Opening your document…'}</h2><p>{label}</p><span className="operation-track" aria-hidden="true"><i/></span><small>{downloading ? 'Fetching your file. The download will start shortly.' : 'Analyzing fields and building page previews.'}</small>
  </div></div>;
}
