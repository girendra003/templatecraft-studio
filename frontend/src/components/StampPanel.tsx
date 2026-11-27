import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { StampAsset, StampPlacement, TemplateField } from '../types';

interface Props {
  fields: TemplateField[];
  placements: StampPlacement[];
  selectedId: string | null;
  page: number;
  customAssets: StampAsset[];
  onUploadAsset: (asset: StampAsset) => void;
  onAdd: (asset: StampAsset, target?: TemplateField) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  notify: (message: string, kind?: 'success' | 'error') => void;
}

export function StampPanel(props: Props) {
  const uploadInput = useRef<HTMLInputElement>(null);
  const [builtIns, setBuiltIns] = useState<StampAsset[]>([]);
  const [assetId, setAssetId] = useState('');
  const [targetKey, setTargetKey] = useState('');
  const assets = useMemo(() => {
    const seen = new Set<string>();
    return [...builtIns, ...props.customAssets].filter((asset) => {
      const identity = asset.image_base64;
      if (seen.has(identity)) return false;
      seen.add(identity); return true;
    });
  }, [builtIns, props.customAssets]);
  const targets = useMemo(() => {
    const seen = new Set<string>();
    return props.fields.filter((field) => ['image', 'signature'].includes(field.type)).filter((field) => {
      const identity = `${field.page_no}:${field.bbox.map((value) => Math.round(value * 10) / 10).join(',')}`;
      if (seen.has(identity)) return false;
      seen.add(identity); return true;
    });
  }, [props.fields]);
  const asset = assets.find((item) => item.id === assetId) || assets[0];
  const target = targets.find((item) => item.key === targetKey);

  useEffect(() => { api.listStamps().then((items) => { setBuiltIns(items); setAssetId((current) => current || items[0]?.id || ''); }).catch(() => undefined); }, []);

  const upload = (file: File) => {
    if (!file.type.startsWith('image/')) { props.notify('Choose a PNG, JPEG, or WebP image.', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { props.notify('Stamp images must be smaller than 5 MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const imageBase64 = String(reader.result).split(',').pop() || '';
      const created: StampAsset = { id: `upload_${Date.now()}`, filename: file.name, label: file.name.replace(/\.[^.]+$/, ''), mime_type: file.type, image_base64: imageBase64 };
      props.onUploadAsset(created); setAssetId(created.id); props.notify(`${created.label} added to your stamp collection.`, 'success');
    };
    reader.readAsDataURL(file);
  };

  return <div className="feature-panel stamp-editor">
    <input ref={uploadInput} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); event.target.value = ''; }} />
    <h2>Signature and stamp</h2><p>Add an image anywhere, then drag and resize it directly on the page. All placement changes use the global Undo, Redo, and Save controls.</p>
    <div className="stamp-summary"><span><b>{props.placements.length}</b> placed images</span><span><b>{assets.length}</b> unique collection items</span></div>
    <div className="stamp-collection-heading"><div><b>Stamp collection</b><span>PNG, JPEG, or WebP · max 5 MB</span></div><button className="button" onClick={() => uploadInput.current?.click()}>＋ Upload image</button></div>
    <div className="stamp-assets">{assets.map((item) => <button key={item.id} className={asset?.id === item.id ? 'selected' : ''} onClick={() => setAssetId(item.id)}><img src={`data:${item.mime_type};base64,${item.image_base64}`} alt="" /><span>{item.label}</span></button>)}</div>
    <label>Optional preset target<select value={targetKey} onChange={(event) => setTargetKey(event.target.value)}><option value="">Free placement on current page</option>{targets.map((field) => <option key={field.key} value={field.key}>{field.label} · P{field.page_no}</option>)}</select></label>
    <button className="button primary wide" disabled={!asset} onClick={() => asset && props.onAdd(asset, target)}>＋ Add to {target ? `${target.label} · P${target.page_no}` : `page ${props.page}`}</button>
    <div className="section-heading"><div><strong>Placed images</strong><small>Select one to focus it on the canvas</small></div></div>
    <div className="placed-stamps">{props.placements.length ? props.placements.map((item) => <article key={item.id} className={props.selectedId === item.id ? 'selected' : ''} onClick={() => props.onSelect(item.id)}><img src={`data:${item.mime_type};base64,${item.image_base64}`} alt="" /><div><b>{item.name}</b><span>Page {item.page_no} · {Math.round(item.bbox[2] - item.bbox[0])} × {Math.round(item.bbox[3] - item.bbox[1])} pt</span></div><button className="button danger" onClick={(event) => { event.stopPropagation(); props.onDelete(item.id); }}>Delete</button></article>) : <div className="stamp-empty"><b>No images placed yet</b><span>Select an item above and add it to the page.</span></div>}</div>
  </div>;
}
