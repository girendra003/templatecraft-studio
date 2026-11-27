import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { TemplateField } from '../types';

interface Props {
  sessionId: string;
  fields: TemplateField[];
  sampleData: Record<string, string>;
  onPreview: (pages: string[]) => void;
  onBeforeServerAction: () => Promise<boolean>;
  notify: (message: string, kind?: 'success' | 'error') => void;
}

export function FillPanel(props: Props) {
  const [values, setValues] = useState(props.sampleData);
  const [flatten, setFlatten] = useState(true);
  const [matchSourceFormat, setMatchSourceFormat] = useState(true);
  const [running, setRunning] = useState(false);
  useEffect(() => setValues(props.sampleData), [props.sampleData]);
  const fillable = props.fields.filter((field) => !['image', 'signature'].includes(field.type));
  const run = async () => {
    setRunning(true);
    try {
      if (!(await props.onBeforeServerAction())) return;
      const result = await api.fillTest(props.sessionId, values, flatten, matchSourceFormat);
      props.onPreview(result.pages_previews_base64 || [result.preview_base64]);
      props.notify('Filled preview generated successfully.', 'success');
    } catch (error) { props.notify(error instanceof Error ? error.message : 'Preview failed', 'error'); }
    finally { setRunning(false); }
  };
  const textFields = props.fields.filter((field) => field.type === 'text');
  const detected = textFields.filter((field) => field.font_detected);
  const fontSummary = [...new Set(detected.map((field) => `${field.source_font || field.font_family} ${field.font_size || 8} pt`))].slice(0, 3).join(', ');
  return <div className="feature-panel fill-panel">
    <h2>Test your form</h2><p>Enter representative values and confirm the output before export.</p>
    <div className={`format-match${matchSourceFormat ? ' active' : ''}`}>
      <div><b>Match source formatting</b><span>{detected.length} of {textFields.length} text fields detected{fontSummary ? ` · ${fontSummary}` : ''}</span></div>
      <label className="switch"><input type="checkbox" checked={matchSourceFormat} onChange={(event) => setMatchSourceFormat(event.target.checked)} /><span /></label>
      <small>{matchSourceFormat ? 'Automatic: font family, size, weight, italic style, and color are applied to injected values.' : 'Off: injected values use standard Helvetica 8 pt.'}</small>
    </div>
    <label className="toggle"><input type="checkbox" checked={flatten} onChange={(event) => setFlatten(event.target.checked)} /> Flatten into e-sign style output</label>
    <button className="button primary wide" onClick={run} disabled={running}>{running ? 'Generating…' : 'Generate filled preview'}</button>
    <div className="fill-fields">{fillable.map((field, index) => <label key={`${field.page_no}-${index}`}>{field.label}<code>{field.key}</code>{field.type === 'checkbox' ? <select value={values[field.key] || 'Off'} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}><option>Off</option><option>Yes</option></select> : field.type === 'textarea' ? <textarea rows={3} value={values[field.key] || ''} placeholder={field.description} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} /> : <input type={field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'} value={values[field.key] || ''} placeholder={field.description} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} />}</label>)}</div>
  </div>;
}
