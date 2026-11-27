import { useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentText } from '../types';

interface Props {
  items: DocumentText[];
  currentPage: number;
  selectedId: string | null;
  onLocate: (item: DocumentText) => void;
  onUpdate: (id: string, text: string) => void;
}

export function DocumentTextPanel({ items, currentPage, selectedId, onLocate, onUpdate }: Props) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState<number | 'all'>(currentPage);
  const [editing, setEditing] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const pages = Math.max(1, ...items.map((item) => item.page_no));
  const visible = useMemo(() => items.filter((item) => (page === 'all' || item.page_no === page) && (!query || item.text.toLowerCase().includes(query.toLowerCase()))), [items, page, query]);
  useEffect(() => {
    if (!selectedId) return;
    setQuery(''); setPage('all');
    const timer = window.setTimeout(() => itemRefs.current.get(selectedId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 40);
    return () => window.clearTimeout(timer);
  }, [selectedId]);

  return <div className="document-text-panel">
    <div className="content-notice"><b>Edit existing PDF text</b><span>Text is replaced in the document using its detected font, size, style, and color. Save to regenerate the PDF.</span></div>
    <input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search document text…" />
    <div className="filter-pills"><button className={page === 'all' ? 'active' : ''} onClick={() => setPage('all')}>All pages</button>{Array.from({ length: pages }, (_, index) => <button key={index} className={page === index + 1 ? 'active' : ''} onClick={() => setPage(index + 1)}>Page {index + 1}</button>)}</div>
    <div className="content-list">{visible.map((item) => <article ref={(element) => { if (element) itemRefs.current.set(item.id, element); else itemRefs.current.delete(item.id); }} key={item.id} className={`${item.text !== item.original_text ? 'changed' : ''}${selectedId === item.id ? ' selected reveal' : ''}`}>
      <div><span className="page-badge">P{item.page_no}</span><p>{item.text || <em>Removed text</em>}</p></div>
      <small>{item.source_font || item.font_family || 'PDF font'} · {item.font_size} pt · {item.font_style || 'Regular'}</small>
      <div className="field-actions"><button className="button" onClick={() => onLocate(item)}>Locate</button><button className="button" onClick={() => setEditing(editing === item.id ? null : item.id)}>Edit text</button></div>
      {editing === item.id && <form className="content-edit" onSubmit={(event) => { event.preventDefault(); onUpdate(item.id, String(new FormData(event.currentTarget).get('text') || '')); setEditing(null); }}>
        <textarea name="text" defaultValue={item.text} rows={3} autoFocus />
        <div><button type="button" className="button" onClick={() => setEditing(null)}>Cancel</button><button className="button primary">Apply</button></div>
      </form>}
    </article>)}</div>
  </div>;
}
