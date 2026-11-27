import { useRef, useState } from 'react';
import { DocumentDemo } from './DocumentDemo';
import { Icon } from './Icon';
interface Props { loading: boolean; onFile: (file: File) => void; onSample: () => void; }
export function StartScreen({ loading, onFile, onSample }: Props) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const accept = (file?: File) => {
    if (!file || loading) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) { setError('Choose a PDF document to continue.'); return; }
    setError(''); onFile(file);
  };
  return <main className="start-screen">
    <div className="welcome-copy"><span className="eyebrow"><i/> YOUR DOCUMENTS, READY FOR WHAT’S NEXT</span><h1>From PDF to<br/><span>possibility.</span></h1><p>A focused workspace to build better forms. Arrange fields, add signatures, and deliver templates ready for your next workflow.</p><div className="welcome-actions"><button className="button primary" disabled={loading} onClick={() => input.current?.click()}>Open your PDF <span aria-hidden="true">↗</span></button><button className="button" disabled={loading} onClick={() => onSample()}>Explore an example →</button></div><div className="welcome-tags"><span>Multi-page editing</span><span>Signzy exports</span><span>Source typography</span></div></div>
    <DocumentDemo/>
    <section className={`drop-card${dragging ? ' dragging' : ''}`} aria-busy={loading}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); accept(event.dataTransfer.files[0]); }}>
      <input ref={input} className="visually-hidden" type="file" accept="application/pdf,.pdf" disabled={loading} onChange={(event) => { accept(event.target.files?.[0]); event.target.value = ''; }}/>
      <div className={`drop-icon${loading ? ' spinning' : ''}`}><Icon name={loading ? 'document' : 'upload'} size={30}/></div>
      <small>LET’S MAKE IT EDITABLE</small><h2>{loading ? 'Preparing your document…' : 'Drop your PDF here'}</h2>
      <p>{loading ? 'Building page previews and your editing workspace.' : 'Use your own PDF, or explore our fictional sample form.'}</p>
      <button className="button primary" disabled={loading} onClick={() => input.current?.click()}>{loading ? 'Preparing…' : 'Browse files'} <span aria-hidden="true">↗</span></button>
      <span className="drop-caption">PDF documents · drag and drop supported</span>{error && <p role="alert" className="upload-error">{error}</p>}
    </section>
    <section className="sample-gallery single-sample" aria-label="Example form"><div className="sample-gallery-heading"><div><span className="eyebrow">A SAFE PLACE TO EXPLORE</span><h2>One sample. Every possibility.</h2></div><span>Fictional details. Real editing tools.</span></div><div className="sample-cards"><button className="sample-card" disabled={loading} onClick={onSample}><div className="sample-card-art"><div className="sample-mini-page"><Icon name="document" size={20}/><b>Client Details &amp; Consent</b><i/><i/><div><span/><span/></div><i/></div><span className="sample-index">DEMO / 01</span></div><small>FICTIONAL SAMPLE TEMPLATE</small><h3>Client Details &amp; Consent</h3><p>A two-page form with contact details, consent, review notes and signature areas. Made just for exploring TemplateCraft.</p><span className="sample-open">Open sample <span aria-hidden="true">↗</span></span></button></div></section>
    <footer className="welcome-footer">A little more precision. A lot less paperwork.<span>TemplateCraft Studio</span></footer>
  </main>;
}
