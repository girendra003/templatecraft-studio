import { useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentText, PageLayout, PreviewMode, StampPlacement, TemplateField } from '../types';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
type Handle = 'move' | 'tl' | 'tr' | 'bl' | 'br';

interface Props {
  pages: string[];
  filledPages: string[];
  fields: TemplateField[];
  staticTexts: DocumentText[];
  stamps: StampPlacement[];
  stampPages: string[];
  page: number;
  mode: PreviewMode;
  layout: PageLayout;
  selectedKey: string | null;
  selectedTextId: string | null;
  contentEditing: boolean;
  stampEditing: boolean;
  selectedStampId: string | null;
  onPage: (page: number) => void;
  onMode: (mode: PreviewMode) => void;
  onLayout: (layout: PageLayout) => void;
  onSelect: (key: string | null) => void;
  onSelectText: (id: string | null) => void;
  onSelectStamp: (id: string | null) => void;
  onBounds: (index: number, bbox: [number, number, number, number]) => void;
  onStampBounds: (index: number, bbox: [number, number, number, number]) => void;
}

export function PdfCanvas(props: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [draft, setDraft] = useState<{ index: number; bbox: [number, number, number, number] } | null>(null);
  const [stampDraft, setStampDraft] = useState<{ index: number; bbox: [number, number, number, number] } | null>(null);
  const drag = useRef<{ index: number; handle: Handle; startX: number; startY: number; bbox: [number, number, number, number] } | null>(null);
  const stampDrag = useRef<{ index: number; handle: Handle; startX: number; startY: number; bbox: [number, number, number, number] } | null>(null);
  const sourcePages = props.stampEditing && props.stampPages.length ? props.stampPages : props.mode === 'filled' && props.filledPages.length ? props.filledPages : props.pages;
  const fieldsByPage = useMemo(() => {
    const groups = new Map<number, { field: TemplateField; index: number }[]>();
    props.fields.forEach((field, index) => { const page = Number(field.page_no || 1); const group = groups.get(page) || []; group.push({ field, index }); groups.set(page, group); });
    return groups;
  }, [props.fields]);
  const pageFields = fieldsByPage.get(props.page) || [];
  const pageTexts = useMemo(() => props.staticTexts.filter((item) => item.page_no === props.page), [props.staticTexts, props.page]);
  const pageStamps = useMemo(() => props.stamps.map((stamp, index) => ({ stamp, index })).filter(({ stamp }) => stamp.page_no === props.page), [props.stamps, props.page]);

  useEffect(() => {
    if (drag.current || stampDrag.current || !props.selectedKey || props.layout !== 'single' || props.mode !== 'edit' || !viewportRef.current) return;
    const selected = props.fields.find((field) => field.key === props.selectedKey && field.page_no === props.page);
    if (!selected) return;
    const viewport = viewportRef.current;
    const target = selected.bbox[1] / PAGE_HEIGHT * viewport.scrollHeight;
    viewport.scrollTo({ top: Math.max(0, target - viewport.clientHeight / 2), behavior: 'smooth' });
  }, [props.selectedKey, props.page, props.layout, props.mode, props.fields]);

  const begin = (event: React.PointerEvent, index: number, handle: Handle) => {
    if (props.mode !== 'edit') return;
    event.preventDefault();
    event.stopPropagation();
    const field = props.fields[index];
    props.onSelect(field.key);
    drag.current = { index, handle, startX: event.clientX, startY: event.clientY, bbox: [...field.bbox] };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const beginStamp = (event: React.PointerEvent, index: number, handle: Handle) => {
    event.preventDefault(); event.stopPropagation();
    const stamp = props.stamps[index];
    props.onSelectStamp(stamp.id);
    stampDrag.current = { index, handle, startX: event.clientX, startY: event.clientY, bbox: [...stamp.bbox] };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const nextBounds = (handle: Handle, bbox: [number, number, number, number], dx: number, dy: number) => {
    let [x0, y0, x1, y1] = bbox; const min = 8;
    if (handle === 'move') {
      const width = x1 - x0; const height = y1 - y0;
      x0 = Math.max(0, Math.min(PAGE_WIDTH - width, x0 + dx)); y0 = Math.max(0, Math.min(PAGE_HEIGHT - height, y0 + dy));
      x1 = x0 + width; y1 = y0 + height;
    } else {
      if (handle.includes('l')) x0 = Math.max(0, Math.min(x1 - min, x0 + dx));
      if (handle.includes('r')) x1 = Math.min(PAGE_WIDTH, Math.max(x0 + min, x1 + dx));
      if (handle.includes('t')) y0 = Math.max(0, Math.min(y1 - min, y0 + dy));
      if (handle.includes('b')) y1 = Math.min(PAGE_HEIGHT, Math.max(y0 + min, y1 + dy));
    }
    return [x0, y0, x1, y1] as [number, number, number, number];
  };

  const move = (event: React.PointerEvent) => {
    if ((!drag.current && !stampDrag.current) || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (drag.current) {
      const { index, handle, startX, startY, bbox } = drag.current;
      setDraft({ index, bbox: nextBounds(handle, bbox, (event.clientX - startX) * PAGE_WIDTH / rect.width, (event.clientY - startY) * PAGE_HEIGHT / rect.height) });
    } else if (stampDrag.current) {
      const { index, handle, startX, startY, bbox } = stampDrag.current;
      setStampDraft({ index, bbox: nextBounds(handle, bbox, (event.clientX - startX) * PAGE_WIDTH / rect.width, (event.clientY - startY) * PAGE_HEIGHT / rect.height) });
    }
  };

  const end = () => {
    if (draft) props.onBounds(draft.index, draft.bbox.map((value) => Math.round(value * 10) / 10) as [number, number, number, number]);
    if (stampDraft) props.onStampBounds(stampDraft.index, stampDraft.bbox.map((value) => Math.round(value * 10) / 10) as [number, number, number, number]);
    drag.current = null;
    stampDrag.current = null;
    setDraft(null);
    setStampDraft(null);
  };

  const renderFields = (items: { field: TemplateField; index: number }[], editable: boolean) => items.map(({ field, index }) => {
    const bbox = draft?.index === index ? draft.bbox : field.bbox;
    const [x0, y0, x1, y1] = bbox;
    return <div
      key={`${field.page_no}-${index}`}
      tabIndex={0}
      role="button"
      aria-label={`Select ${field.label || field.key}`}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); props.onPage(field.page_no); props.onLayout('single'); props.onSelect(field.key); } }}
      className={`canvas-field${props.selectedKey === field.key ? ' selected' : ''}`}
      style={{ left: `${x0 / PAGE_WIDTH * 100}%`, top: `${y0 / PAGE_HEIGHT * 100}%`, width: `${(x1 - x0) / PAGE_WIDTH * 100}%`, height: `${(y1 - y0) / PAGE_HEIGHT * 100}%` }}
      title={field.label || field.key}
      onPointerDown={editable ? (event) => begin(event, index, 'move') : undefined}
      onClick={(event) => { event.stopPropagation(); if (!editable) { props.onPage(field.page_no); props.onLayout('single'); } props.onSelect(field.key); }}
    >
      {editable && <><span>{field.label || field.key}</span>{(['tl', 'tr', 'bl', 'br'] as Handle[]).map((handle) => <i key={handle} className={`handle ${handle}`} onPointerDown={(event) => begin(event, index, handle)} />)}</>}
    </div>;
  });

  const renderStamps = () => pageStamps.map(({ stamp, index }) => {
    const bbox = stampDraft?.index === index ? stampDraft.bbox : stamp.bbox;
    return <div key={stamp.id} className={`canvas-stamp${props.selectedStampId === stamp.id ? ' selected' : ''}`} style={{ left: `${bbox[0] / PAGE_WIDTH * 100}%`, top: `${bbox[1] / PAGE_HEIGHT * 100}%`, width: `${(bbox[2] - bbox[0]) / PAGE_WIDTH * 100}%`, height: `${(bbox[3] - bbox[1]) / PAGE_HEIGHT * 100}%` }} onPointerDown={(event) => beginStamp(event, index, 'move')} onClick={(event) => { event.stopPropagation(); props.onSelectStamp(stamp.id); }}>
      <img src={`data:${stamp.mime_type};base64,${stamp.image_base64}`} alt={stamp.name} />
      <span>{stamp.name}</span>
      {(['tl', 'tr', 'bl', 'br'] as Handle[]).map((handle) => <i key={handle} className={`handle ${handle}`} onPointerDown={(event) => beginStamp(event, index, handle)} />)}
    </div>;
  });

  return <section className="canvas-panel">
    <div className="canvas-tools">
      <div className="segmented">
        {(['edit', 'clean', 'filled'] as PreviewMode[]).map((mode) => <button key={mode} className={props.mode === mode ? 'active' : ''} disabled={mode === 'filled' && !props.filledPages.length} aria-pressed={props.mode === mode} onClick={() => props.onMode(mode)}>{mode === 'edit' ? 'Edit fields' : mode === 'clean' ? 'Preview clean' : 'Preview filled'}</button>)}
      </div>
      <div className="zoom-tools"><button aria-label="Zoom out" disabled={zoom <= .6} onClick={() => setZoom(Math.max(.6, Math.round((zoom - .1) * 10) / 10))}>−</button><span>{Math.round(zoom * 100)}%</span><button aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom(Math.min(2, Math.round((zoom + .1) * 10) / 10))}>+</button><button aria-label="Fit page width" title="Fit width" onClick={() => setZoom(1)}>↺</button></div>
    </div>
    <div className="page-tools">
      <button className="button" disabled={props.page <= 1 || props.layout === 'continuous'} onClick={() => props.onPage(props.page - 1)}>‹ Prev</button>
      <strong>Page {props.page} of {sourcePages.length}</strong>
      <button className="button" disabled={props.page >= sourcePages.length || props.layout === 'continuous'} onClick={() => props.onPage(props.page + 1)}>Next ›</button>
      <div className="page-pills">{sourcePages.map((_, index) => <button key={index} className={props.page === index + 1 ? 'active' : ''} onClick={() => props.onPage(index + 1)}>{index + 1}</button>)}</div>
      <div className="segmented layout"><button className={props.layout === 'single' ? 'active' : ''} onClick={() => props.onLayout('single')}>Page</button><button className={props.layout === 'continuous' ? 'active' : ''} onClick={() => props.onLayout('continuous')}>Continuous</button></div>
    </div>
    <div className="canvas-viewport" ref={viewportRef} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      {props.layout === 'single' ? <div className="pdf-page" ref={canvasRef} style={{ width: `${zoom * 100}%`, maxWidth: `${820 * zoom}px` }} onClick={() => { props.onSelect(null); props.onSelectText(null); props.onSelectStamp(null); }}>
        {sourcePages[props.page - 1] && <img src={`data:image/png;base64,${sourcePages[props.page - 1]}`} alt={`PDF page ${props.page}`} />}
        {props.mode === 'edit' && renderFields(pageFields, true)}
        {props.contentEditing && pageTexts.map((item) => <button key={item.id} className={`document-text-zone${props.selectedTextId === item.id ? ' selected' : ''}`} style={{ left: `${item.bbox[0] / PAGE_WIDTH * 100}%`, top: `${item.bbox[1] / PAGE_HEIGHT * 100}%`, width: `${(item.bbox[2] - item.bbox[0]) / PAGE_WIDTH * 100}%`, height: `${(item.bbox[3] - item.bbox[1]) / PAGE_HEIGHT * 100}%` }} title={item.text} onClick={(event) => { event.stopPropagation(); props.onSelectText(item.id); }} />)}
        {props.stampEditing && renderStamps()}
      </div> : <div className="continuous-stack" style={{ width: `${zoom * 100}%`, maxWidth: `${820 * zoom}px` }}>{sourcePages.map((image, pageIndex) => <div className="continuous-sheet" key={pageIndex}><small>Page {pageIndex + 1}</small><img loading="lazy" decoding="async" src={`data:image/png;base64,${image}`} alt={`PDF page ${pageIndex + 1}`} />{props.mode === 'edit' && renderFields(fieldsByPage.get(pageIndex + 1) || [], false)}</div>)}</div>}
    </div>
    <footer>{props.stampEditing ? <><b>Stamp mode:</b> drag images anywhere on the page and resize from their corners. Undo, redo, then save.</> : props.contentEditing ? <><b>Document text:</b> click any highlighted text to reveal and edit it in the right panel.</> : <><b>Edit mode:</b> click or drag a field to reveal it in the right panel, then resize from its corners.</>}</footer>
  </section>;
}
