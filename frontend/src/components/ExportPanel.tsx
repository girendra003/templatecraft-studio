import { useMemo, useState } from 'react';
import type { SignzyField, TemplateField } from '../types';

type DownloadKind = 'template' | 'signzy_json' | 'blank' | 'bundle';

interface Props {
  fields: TemplateField[];
  schema: Record<string, SignzyField>;
  onDownload: (kind: DownloadKind) => void;
  notify: (message: string, kind?: 'success' | 'error') => void;
}

const downloads: { kind: DownloadKind; title: string; detail: string }[] = [
  { kind: 'template', title: 'Editable PDF', detail: 'Fields and placements ready for use' },
  { kind: 'signzy_json', title: 'Signzy JSON', detail: 'Production field mapping schema' },
  { kind: 'blank', title: 'Blank PDF', detail: 'Clean document without field values' },
  { kind: 'bundle', title: 'Export all', detail: 'PDFs, schema and sample data in one ZIP' },
];

export function ExportPanel({ fields, schema, onDownload, notify }: Props) {
  const [mode, setMode] = useState<'schema' | 'payload'>('schema');
  const payload = useMemo(() => Object.fromEntries(fields.map((field) => [field.key, field.sample_value || ''])), [fields]);
  const content = JSON.stringify(mode === 'schema' ? schema : payload, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      notify('Copied integration JSON.', 'success');
    } catch {
      notify('Could not copy JSON. Select it from the preview instead.', 'error');
    }
  };

  return <div className="feature-panel export-panel">
    <h2>Export and deliver</h2>
    <p>Your current changes are saved automatically before a download starts.</p>
    <div className="export-grid">
      {downloads.map((item) => <button key={item.kind} className={item.kind === 'bundle' ? 'export-card primary-card' : 'export-card'} onClick={() => onDownload(item.kind)}>
        <span>{item.title}</span><small>{item.detail}</small><b>Download →</b>
      </button>)}
    </div>
    <div className="section-heading"><div><strong>Developer handoff</strong><small>Inspect or copy integration data</small></div></div>
    <div className="segmented"><button className={mode === 'schema' ? 'active' : ''} onClick={() => setMode('schema')}>Signzy schema</button><button className={mode === 'payload' ? 'active' : ''} onClick={() => setMode('payload')}>Sample payload</button></div>
    <button className="button wide" onClick={() => void copy()}>Copy JSON</button>
    <pre>{content}</pre>
  </div>;
}
