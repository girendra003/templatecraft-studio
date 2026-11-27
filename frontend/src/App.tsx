import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { palettes, type Palette } from './components/AppearancePicker';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { ActionEffects, OperationLoader, type ActionFlash } from './components/ActionEffects';
import { AppHeader } from './components/AppHeader';
import { ControlPanel } from './components/ControlPanel';
import { EditorToolbar } from './components/EditorToolbar';
import { PdfCanvas } from './components/PdfCanvas';
import { StartScreen } from './components/StartScreen';
import { useEditorHistory } from './hooks/useEditorHistory';
import { api } from './lib/api';
import { oceanRevealFrames } from './lib/themeTransition';
import type { AnalysisResponse, DocumentText, FieldType, PageLayout, PanelTab, PreviewMode, StampAsset, StampPlacement, TemplateField } from './types';

type Toast = { id: number; message: string; kind: 'success' | 'error' | 'info' };

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return localStorage.getItem('templatecraft-theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
  });
  const [palette, setPalette] = useState<Palette>(() => {
    try { const saved = localStorage.getItem('templatecraft-palette'); return palettes.find((item) => item.id === saved)?.id || 'obsidian'; } catch { return 'obsidian'; }
  });
  useEffect(() => {
    window.document.documentElement.dataset.palette = palette;
    try { localStorage.setItem('templatecraft-palette', palette); } catch { /* Storage may be disabled. */ }
  }, [palette]);
  const [helpOpen, setHelpOpen] = useState(false);
  const previousTheme = useRef(theme);
  useEffect(() => {
    const root = window.document.documentElement;
    if (previousTheme.current !== theme && !root.classList.contains('theme-liquid')) root.classList.add('theme-transition');
    previousTheme.current = theme;
    root.dataset.theme = theme;
    try { localStorage.setItem('templatecraft-theme', theme); } catch { /* Storage may be disabled. */ }
    const timer = window.setTimeout(() => root.classList.remove('theme-transition'), 350);
    return () => { window.clearTimeout(timer); root.classList.remove('theme-transition'); };
  }, [theme]);
  const activeTransition = useRef<{ skipTransition: () => void } | null>(null);
  const themeAnimation = useRef<Animation | null>(null);
  const toggleTheme = useCallback(() => {
    const doc = window.document;
    const root = doc.documentElement;
    activeTransition.current?.skipTransition();
    themeAnimation.current?.cancel();
    if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.remove('theme-liquid');
      delete root.dataset.revealDirection;
      setTheme((current) => current === 'light' ? 'dark' : 'light');
      return;
    }
    const button = doc.activeElement?.getBoundingClientRect();
    const x = button && button.width ? button.left + button.width / 2 : window.innerWidth - 40;
    const y = button && button.height ? button.top + button.height / 2 : 38;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.classList.remove('theme-transition');
    root.classList.add('theme-liquid');
    const transition = doc.startViewTransition(() => {
      root.dataset.revealDirection = root.dataset.theme === 'dark' ? 'shrink' : 'expand';
      flushSync(() => setTheme((current) => current === 'light' ? 'dark' : 'light'));
    });
    activeTransition.current = transition;
    void transition.ready.then(() => {
      if (activeTransition.current !== transition) return;
      const shrinking = root.dataset.revealDirection === 'shrink';
      const frames = oceanRevealFrames(x, y, radius);
      const keyframes = shrinking ? [...frames].reverse().map((frame, index) => ({ ...frame, offset: index / (frames.length - 1) })) : frames;
      themeAnimation.current = root.animate(keyframes, {
        duration: 900, easing: 'cubic-bezier(.28,.15,.2,1)', fill: 'forwards',
        pseudoElement: shrinking ? '::view-transition-old(root)' : '::view-transition-new(root)',
      });
      return themeAnimation.current.finished.then(() => transition.skipTransition());
    }).catch(() => { /* A newer mode switch may replace this transition. */ });
    void transition.finished.catch(() => undefined).finally(() => {
      if (activeTransition.current === transition) {
        activeTransition.current = null;
        root.classList.remove('theme-liquid');
        delete root.dataset.revealDirection;
      }
    });
  }, []);
  const saveInFlight = useRef<Promise<boolean> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const history = useEditorHistory();
  const [document, setDocument] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const downloadInFlight = useRef(false);
  const [operationLabel, setOperationLabel] = useState('');
  const [flash, setFlash] = useState<ActionFlash | null>(null);
  const flashId = useRef(0);
  const celebrate = (kind: ActionFlash['kind'], label: string) => setFlash({ id: ++flashId.current, kind, label });
  useEffect(() => { if (!flash) return; const timer = window.setTimeout(() => setFlash(null), 1600); return () => window.clearTimeout(timer); }, [flash]);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [layout, setLayout] = useState<PageLayout>('single');
  const [mode, setMode] = useState<PreviewMode>('edit');
  const [tab, setTab] = useState<PanelTab>('fields');
  const [fieldView, setFieldView] = useState<'fields' | 'content'>('fields');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedStampId, setSelectedStampId] = useState<string | null>(null);
  const [customStampAssets, setCustomStampAssets] = useState<StampAsset[]>([]);
  const [stampBasePages, setStampBasePages] = useState<string[]>([]);
  const [filledPages, setFilledPages] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => { setFilledPages([]); setMode((current) => current === 'filled' ? 'clean' : current); }, [history.fields, history.staticTexts, history.stamps]);

  const notify = useCallback((message: string, kind: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items.slice(-1), { id, message, kind }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3200);
  }, []);

  const acceptDocument = useCallback((result: AnalysisResponse) => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setDocument(result);
    history.reset(result.fields, result.static_texts || [], result.stamp_placements || []);
    setStampBasePages(result.pages_base_previews_base64 || result.pages_previews_base64);
    setPage(1); setLayout('single'); setMode('edit'); setTab('fields'); setFieldView('fields'); setSelectedKey(null); setSelectedTextId(null); setSelectedStampId(null); setFilledPages([]);
  }, [history.reset]);

  const goHome = () => {
    if (loading || saving || downloading) return;
    if (document && history.dirty && !window.confirm('Return home and discard unsaved changes? Download your work first if you want to keep it.')) return;
    setFlash(null); setDocument(null); history.reset([]); setStampBasePages([]); setFilledPages([]);
    setSelectedKey(null); setSelectedTextId(null); setSelectedStampId(null);
    setPage(1); setLayout('single'); setMode('edit'); setTab('fields'); setFieldView('fields'); setHelpOpen(false); setToasts([]);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const loadSample = async () => {
    if (history.dirty && !window.confirm('Open the sample and discard unsaved changes?')) return;
    setOperationLabel('Client Details & Consent'); setFlash(null); setLoading(true);
    try { acceptDocument(await api.loadSample()); celebrate('upload', 'Sample template loaded'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Unable to load sample', 'error'); }
    finally { setLoading(false); }
  };

  const upload = async (file: File) => {
    if (history.dirty && !window.confirm('Open another document and discard unsaved changes?')) return;
    setOperationLabel(file.name); setFlash(null); setLoading(true);
    try { acceptDocument(await api.uploadPdf(file)); celebrate('upload', file.name); }
    catch (error) { notify(error instanceof Error ? error.message : 'Upload failed', 'error'); }
    finally { setLoading(false); }
  };

  const save = useCallback(async (silent = false) => {
    if (!document) return false;
    if (saveInFlight.current) return saveInFlight.current;
    if (!history.dirty) { if (!silent) notify('All changes are already saved.'); return true; }
    setSaving(true);
    const task = (async () => {
    try {
      const result = await api.saveWorkspace(document.session_id, history.fields, history.staticTexts, history.stamps);
      history.markSaved(result.fields, result.static_texts, result.stamp_placements);
      setStampBasePages(result.pages_base_previews_base64);
      setDocument((current) => current ? { ...current, fields: result.fields, static_texts: result.static_texts, stamp_placements: result.stamp_placements, pages_base_previews_base64: result.pages_base_previews_base64, total_fields: result.total_fields, signzy_schema: result.signzy_schema, sample_data: result.sample_data, pages_previews_base64: result.pages_previews_base64, pages_visual_maps_base64: result.pages_visual_maps_base64 } : current);
      if (!silent) notify('Template changes saved.', 'success');
      return true;
    } catch (error) { notify(error instanceof Error ? error.message : 'Save failed', 'error'); return false; }
    finally { setSaving(false); saveInFlight.current = null; }
    })();
    saveInFlight.current = task;
    return task;
  }, [document, history.dirty, history.fields, history.staticTexts, history.stamps, history.markSaved, notify]);

  const duplicateField = useCallback((index: number) => {
    const source = history.fields[index];
    if (!source) return;
    const used = new Set(history.fields.map((field) => field.key.toLowerCase()));
    let suffix = 1;
    while (used.has(`${source.key}_copy_${suffix}`.toLowerCase())) suffix++;
    const key = `${source.key}_copy_${suffix}`;
    const copy = { ...source, key, label: `${source.label || source.key} (copy)`, bbox: [...source.bbox] as TemplateField['bbox'] };
    history.applyFields((fields) => [...fields, copy]);
    setSelectedKey(key); setPage(source.page_no); setLayout('single'); setMode('edit');
    notify('Field duplicated. Drag it to its new position.', 'success');
  }, [history.fields, history.applyFields, notify]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const command = event.metaKey || event.ctrlKey;
      const typing = event.target instanceof HTMLElement && (!!event.target.closest('input, textarea, select, [contenteditable="true"]'));
      if (event.key === 'Escape') { setHelpOpen(false); setSelectedKey(null); setSelectedTextId(null); setSelectedStampId(null); return; }
      if (helpOpen || loading || saving || downloading) return;
      if (!typing && event.key === '?') { event.preventDefault(); setHelpOpen(true); return; }
      const index = history.fields.findIndex((field) => field.key === selectedKey);
      if (!typing && tab === 'fields' && fieldView === 'fields' && mode === 'edit' && index >= 0) {
        if (command && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateField(index); return; }
        if (!command && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
          event.preventDefault();
          const field = history.fields[index]; const step = event.shiftKey ? 10 : 1;
          const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
          const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
          const [x0, y0, x1, y1] = field.bbox;
          const x = Math.max(0, Math.min(612 - (x1 - x0), x0 + dx));
          const y = Math.max(0, Math.min(792 - (y1 - y0), y0 + dy));
          history.applyFields((fields) => fields.map((item, i) => i === index ? { ...item, bbox: [x, y, x + x1 - x0, y + y1 - y0] } : item));
          return;
        }
      }
      if (command && event.key.toLowerCase() === 's') { event.preventDefault(); void save(); }
      if (!command || event.key.toLowerCase() !== 'z' || typing) return;
      event.preventDefault();
      if (event.shiftKey) history.redo(); else history.undo();
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [history.undo, history.redo, history.fields, history.applyFields, save, selectedKey, duplicateField, tab, fieldView, mode, helpOpen, loading, saving, downloading]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (history.dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [history.dirty]);

  const download = async (kind: 'template' | 'signzy_json' | 'blank' | 'bundle') => {
    if (!document || downloadInFlight.current) return;
    downloadInFlight.current = true;
    try {
      if (!(await save(true))) return;
      setOperationLabel(kind === 'bundle' ? 'Complete template bundle' : kind === 'signzy_json' ? 'Signzy field mapping' : kind === 'blank' ? 'Blank PDF' : 'Editable PDF');
      setFlash(null); setDownloading(true);
      const response = await fetch(api.downloadUrl(document.session_id, kind));
      if (!response.ok) throw new Error('Export failed. Please try again.');
      const blob = await response.blob();
      const filename = response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] || (kind === 'bundle' ? 'template-bundle.zip' : kind === 'signzy_json' ? 'signzy-schema.json' : `${kind}.pdf`);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a'); link.href = url; link.download = filename;
      window.document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      celebrate('download', `${filename} · download started`);
    } catch (error) { notify(error instanceof Error ? error.message : 'Export failed', 'error'); }
    finally { setDownloading(false); downloadInFlight.current = false; }
  };

  const changeTab = (nextTab: PanelTab) => {
    setTab(nextTab);
    if (nextTab === 'fill' && filledPages.length) setMode('filled');
    else if (nextTab === 'export' || nextTab === 'stamp') setMode('clean');
    else setMode(nextTab === 'fields' && fieldView === 'content' ? 'clean' : 'edit');
    if (nextTab === 'stamp') setLayout('single');
  };

  const updateField = (index: number, patch: Partial<TemplateField>) => history.applyFields((fields) => fields.map((field, itemIndex) => itemIndex === index ? { ...field, ...patch, label: patch.label || patch.key || field.label } : field));
  const deleteField = (index: number) => {
    const field = history.fields[index];
    if (!window.confirm(`Delete “${field.label || field.key}”? You can undo this change.`)) return;
    history.applyFields((fields) => fields.filter((_, itemIndex) => itemIndex !== index));
    setSelectedKey(null);
  };
  const fixDuplicates = () => history.applyFields((fields) => {
    const used = new Set(fields.map((field) => field.key.toLowerCase()));
    const seen = new Set<string>();
    return fields.map((field) => {
      const normalized = field.key.toLowerCase();
      if (!seen.has(normalized)) { seen.add(normalized); return field; }
      let suffix = 1;
      let key = `${field.key}_${suffix}`;
      while (used.has(key.toLowerCase())) { suffix += 1; key = `${field.key}_${suffix}`; }
      used.add(key.toLowerCase());
      return { ...field, key };
    });
  });

  const addField = ({ key: requestedKey, label, type }: { key: string; label: string; type: FieldType }) => {
    const used = new Set(history.fields.map((field) => field.key.toLowerCase()));
    let key = requestedKey || `field_${history.fields.length + 1}`;
    let suffix = 1;
    while (used.has(key.toLowerCase())) { key = `${requestedKey}_${suffix}`; suffix += 1; }
    const [width, height] = type === 'checkbox' ? [18, 18] : ['image', 'signature'].includes(type) ? [180, 90] : type === 'textarea' ? [240, 72] : [180, 26];
    const x0 = 72; const y0 = 72;
    const field: TemplateField = { key, label: label || key, type, page_no: page, section: `Custom fields · Page ${page}`, bbox: [x0, y0, x0 + width, y0 + height], width, height, description: '', sample_value: '', font_size: 10, font_family: 'Helvetica', font_style: 'Regular', font_color: '#000000', pdf_font: 'helv', widget_font: 'Helv', font_detected: false };
    history.applyFields((fields) => [...fields, field]);
    setSelectedKey(key); setMode('edit'); setLayout('single');
    notify(`${label || key} added to page ${page}. Drag it to the correct location.`, 'success');
  };

  const updateDocumentText = (id: string, text: string) => history.applyStaticTexts((items) => items.map((item) => item.id === id ? { ...item, text } : item));
  const locateDocumentText = (item: DocumentText) => { setPage(item.page_no); setLayout('single'); setMode('clean'); setSelectedKey(null); setSelectedTextId(item.id); };
  const selectDocumentText = (id: string | null) => {
    setSelectedTextId(id);
    if (!id) return;
    const item = history.staticTexts.find((entry) => entry.id === id);
    if (item) setPage(item.page_no);
  };

  const addStamp = (asset: StampAsset, target?: TemplateField) => {
    const pageNo = target?.page_no || page;
    const bbox: [number, number, number, number] = target ? [...target.bbox] : [206, 326, 406, 426];
    const placement: StampPlacement = { id: `stamp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, asset_id: asset.id, name: asset.label, mime_type: asset.mime_type, image_base64: asset.image_base64, page_no: pageNo, bbox };
    history.applyStamps((items) => [...items, placement]);
    setPage(pageNo); setLayout('single'); setMode('clean'); setSelectedStampId(placement.id);
    notify(`${asset.label} added to page ${pageNo}. Drag and resize it, then save.`, 'success');
  };
  const updateStampBounds = (index: number, bbox: [number, number, number, number]) => history.applyStamps((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, bbox } : item));
  const deleteStamp = (id: string) => { history.applyStamps((items) => items.filter((item) => item.id !== id)); setSelectedStampId(null); };

  return <div className="app-shell">
    <input ref={fileInput} className="visually-hidden" type="file" accept="application/pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ''; }} />
    <AppHeader onHome={goHome} onOpen={() => fileInput.current?.click()} onSample={() => void loadSample()} theme={theme} palette={palette} onPalette={setPalette} onTheme={toggleTheme} onHelp={() => setHelpOpen(true)} busy={loading || saving || downloading} />
    <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    {!document ? <StartScreen onSample={() => void loadSample()} loading={loading} onFile={(file) => void upload(file)} /> : <main key={document.session_id} className="editor-main workspace-arrival">
      <EditorToolbar filename={document.filename} fieldCount={history.fields.length} pageCount={document.page_count} dirty={history.dirty} saving={saving} canUndo={history.canUndo} canRedo={history.canRedo} onUndo={history.undo} onRedo={history.redo} onSave={() => void save()} />
      <div className="workspace" inert={saving || loading || downloading} aria-busy={saving}>
        <PdfCanvas pages={document.pages_previews_base64} stampPages={stampBasePages} filledPages={filledPages} fields={history.fields} staticTexts={history.staticTexts} stamps={history.stamps} page={page} mode={mode} layout={layout} selectedKey={selectedKey} selectedTextId={selectedTextId} selectedStampId={selectedStampId} contentEditing={tab === 'fields' && fieldView === 'content'} stampEditing={tab === 'stamp'} onPage={setPage} onMode={setMode} onLayout={setLayout} onSelect={setSelectedKey} onSelectText={selectDocumentText} onSelectStamp={setSelectedStampId} onBounds={(index, bbox) => updateField(index, { bbox, width: bbox[2] - bbox[0], height: bbox[3] - bbox[1] })} onStampBounds={updateStampBounds} />
        <ControlPanel tab={tab} onTab={changeTab} sessionId={document.session_id} fields={history.fields} staticTexts={history.staticTexts} stamps={history.stamps} stampAssets={customStampAssets} selectedKey={selectedKey} selectedTextId={selectedTextId} selectedStampId={selectedStampId} page={page} schema={document.signzy_schema} sampleData={document.sample_data} onSelect={(field) => { setPage(field.page_no); setLayout('single'); setMode('edit'); setSelectedTextId(null); setSelectedKey(field.key); }} onDelete={deleteField} onDuplicate={duplicateField} onUpdate={updateField} onAdd={addField} onFixDuplicates={fixDuplicates} onLocateText={locateDocumentText} onUpdateText={updateDocumentText} onFieldViewChange={(view) => { setFieldView(view); setMode(view === 'content' ? 'clean' : 'edit'); setSelectedKey(null); setSelectedTextId(null); }} onUploadStamp={(asset) => setCustomStampAssets((items) => [...items, asset])} onAddStamp={addStamp} onSelectStamp={(id) => { const stamp = history.stamps.find((item) => item.id === id); if (stamp) setPage(stamp.page_no); setSelectedStampId(id); }} onDeleteStamp={deleteStamp} onBeforeServerAction={() => save(true)} onPreview={(pages) => { setFilledPages(pages); setMode('filled'); }} onDownload={(kind) => void download(kind)} notify={notify} />
      </div>
    </main>}
    {(loading || downloading) && <OperationLoader label={operationLabel} downloading={downloading}/>}
    <ActionEffects flash={flash}/>
    <div className="toast-stack" role="status" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className={`toast ${toast.kind}`}>{toast.message}</div>)}</div>
  </div>;
}
