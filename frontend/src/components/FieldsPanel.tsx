import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentText, FieldType, TemplateField } from '../types';
import { DocumentTextPanel } from './DocumentTextPanel';

interface Props {
  fields: TemplateField[];
  staticTexts: DocumentText[];
  currentPage: number;
  selectedKey: string | null;
  selectedTextId: string | null;
  onSelect: (field: TemplateField) => void;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
  onUpdate: (index: number, patch: Partial<TemplateField>) => void;
  onAdd: (field: { key: string; label: string; type: FieldType }) => void;
  onFixDuplicates: () => void;
  onLocateText: (item: DocumentText) => void;
  onUpdateText: (id: string, text: string) => void;
  onViewChange: (view: 'fields' | 'content') => void;
}

const fieldTypes: { type: FieldType; label: string }[] = [
  { type: 'text', label: 'Text' }, { type: 'textarea', label: 'Multiline text' },
  { type: 'date', label: 'Date' }, { type: 'time', label: 'Time' },
  { type: 'checkbox', label: 'Checkbox' }, { type: 'image', label: 'Image' },
  { type: 'signature', label: 'Signature' },
];

export function FieldsPanel(props: Props) {
  const [view, setView] = useState<'fields' | 'content'>('fields');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState<number | 'all'>('all');
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const fieldRefs = useRef(new Map<string, HTMLElement>());
  const duplicateIndexes = useMemo(() => {
    const groups = new Map<string, number[]>();
    props.fields.forEach((field, index) => {
      const key = field.key.trim().toLowerCase();
      groups.set(key, [...(groups.get(key) || []), index]);
    });
    return new Set([...groups.values()].filter((group) => group.length > 1).flat());
  }, [props.fields]);
  const pageCount = Math.max(1, ...props.fields.map((field) => field.page_no));
  const visible = useMemo(() => props.fields.map((field, index) => ({ field, index })).filter(({ field }) => {
    const text = `${field.key} ${field.label} ${field.section}`.toLowerCase();
    return (!deferredQuery || text.includes(deferredQuery.toLowerCase())) && (page === 'all' || field.page_no === page) && (typeFilter === 'all' || field.type === typeFilter);
  }), [props.fields, deferredQuery, page, typeFilter]);

  useEffect(() => {
    if (!props.selectedKey) return;
    setView('fields'); setQuery(''); setPage('all'); setTypeFilter('all');
    const timer = window.setTimeout(() => fieldRefs.current.get(props.selectedKey!)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 40);
    return () => window.clearTimeout(timer);
  }, [props.selectedKey]);

  return <div className="fields-panel">
    <div className="panel-subnav"><button className={view === 'fields' ? 'active' : ''} onClick={() => { setView('fields'); props.onViewChange('fields'); }}>Form fields <small>{props.fields.length}</small></button><button className={view === 'content' ? 'active' : ''} onClick={() => { setView('content'); props.onViewChange('content'); }}>Document text <small>{props.staticTexts.length}</small></button></div>
    {view === 'content' ? <DocumentTextPanel items={props.staticTexts} currentPage={props.currentPage} selectedId={props.selectedTextId} onLocate={props.onLocateText} onUpdate={props.onUpdateText} /> : <>
      <div className="fields-heading"><div><b>Editable fields</b><span>Add a field, then drag and resize it on the page.</span></div><button className="button primary" onClick={() => setAdding(!adding)}>＋ Add field</button></div>
      {adding && <form className="add-field-form" onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const key = String(form.get('key') || '').trim().replace(/\s+/g, '_');
        props.onAdd({ key, label: String(form.get('label') || key).trim(), type: String(form.get('type')) as FieldType });
        setAdding(false);
      }}>
        <label>Field type<select name="type">{fieldTypes.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}</select></label>
        <label>Field name / key<input name="key" placeholder="e.g. appointment_date" required /></label>
        <label>Display label<input name="label" placeholder="e.g. Appointment date" /></label>
        <div><button type="button" className="button" onClick={() => setAdding(false)}>Cancel</button><button className="button primary">Add to page {props.currentPage}</button></div>
      </form>}
      <div className={`duplicate-check${duplicateIndexes.size ? ' warning' : ''}`}>
        <div><b>Duplicate-name check</b><span>{duplicateIndexes.size ? `${duplicateIndexes.size} fields share duplicate names.` : 'All field names are unique.'}</span></div>
        {duplicateIndexes.size > 0 && <button className="button primary" onClick={props.onFixDuplicates}>Make unique</button>}
      </div>
      <input aria-label="Search fields" className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names, labels, or sections…" />
      <div className="filter-pills"><button className={page === 'all' ? 'active' : ''} onClick={() => setPage('all')}>All pages</button>{Array.from({ length: pageCount }, (_, index) => <button key={index} className={page === index + 1 ? 'active' : ''} onClick={() => setPage(index + 1)}>Page {index + 1}</button>)}</div>
      <div className="field-filter-row"><span>{visible.length} of {props.fields.length} fields</span><label>Type <select aria-label="Filter field type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">All types</option>{fieldTypes.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}</select></label></div>
      {!visible.length && <div className="empty-results"><b>No matching fields</b><p>Try a different search or clear your filters.</p><button className="button" onClick={() => { setQuery(''); setPage('all'); setTypeFilter('all'); }}>Clear filters</button></div>}
      <div className="field-list">{visible.map(({ field, index }) => <article ref={(element) => { if (element) fieldRefs.current.set(field.key, element); else fieldRefs.current.delete(field.key); }} data-field-key={field.key} key={`${field.page_no}-${index}`} className={`${props.selectedKey === field.key ? 'selected reveal' : ''}${duplicateIndexes.has(index) ? ' duplicate' : ''}`}>
        <div className="field-summary"><span className="page-badge">P{field.page_no}</span><div><b>{field.label || field.key}</b><code>{field.key}</code><small>{field.section} · [{field.bbox.join(', ')}]</small></div><em>{field.type}</em></div>
        <div className="field-actions"><button className="button" onClick={() => props.onSelect(field)}>Locate</button><button className="button" onClick={() => setEditing(editing === index ? null : index)}>Edit</button><button className="button" title="Duplicate field (⌘/Ctrl D)" onClick={() => props.onDuplicate(index)}>Duplicate</button><button className="button danger" onClick={() => props.onDelete(index)}>Delete</button></div>
        {editing === index && <form className="field-form" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const x = Number(form.get('x')), y = Number(form.get('y')), width = Number(form.get('width')), height = Number(form.get('height'));
          if (x + width > 612 || y + height > 792) {
            const input = event.currentTarget.elements.namedItem(x + width > 612 ? 'width' : 'height') as HTMLInputElement;
            input.setCustomValidity('Keep the field within the page.'); input.reportValidity(); input.setCustomValidity(''); return;
          }
          props.onUpdate(index, { key: String(form.get('key') || '').trim().replace(/\s+/g, '_'), label: String(form.get('label') || '').trim(), type: String(form.get('type')) as FieldType, description: String(form.get('description') || '').trim(),
            bbox: [Number(form.get('x')), Number(form.get('y')), Number(form.get('x')) + Number(form.get('width')), Number(form.get('y')) + Number(form.get('height'))],
            width: Number(form.get('width')), height: Number(form.get('height')) });
          setEditing(null);
        }}>
          <label>Field name / key<input name="key" defaultValue={field.key} required /></label>
          <label>Field type<select name="type" defaultValue={field.type}>{fieldTypes.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}</select></label>
          <label>Display label<input name="label" defaultValue={field.label} /></label>
          <label>Placeholder / help text<input name="description" defaultValue={field.description} /></label>
          <fieldset className="position-controls"><legend>Position & size <span>PDF points</span></legend><div className="coordinate-grid">{[
            { name: 'x', label: 'X', value: field.bbox[0], max: 604 }, { name: 'y', label: 'Y', value: field.bbox[1], max: 784 },
            { name: 'width', label: 'Width', value: field.bbox[2] - field.bbox[0], max: 612 }, { name: 'height', label: 'Height', value: field.bbox[3] - field.bbox[1], max: 792 },
          ].map((item) => <label key={item.name}>{item.label}<input name={item.name} type="number" required step="0.1" min={item.name === 'x' || item.name === 'y' ? 0 : 8} max={item.max} defaultValue={Math.round(item.value * 10) / 10}/></label>)}</div></fieldset>
          <div><button type="button" className="button" onClick={() => setEditing(null)}>Cancel</button><button className="button primary">Apply</button></div>
        </form>}
      </article>)}</div>
    </>}
  </div>;
}
