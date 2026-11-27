import { Icon, type IconName } from './Icon';
import type { DocumentText, FieldType, PanelTab, SignzyField, StampAsset, StampPlacement, TemplateField } from '../types';
import { FieldsPanel } from './FieldsPanel';
import { FillPanel } from './FillPanel';
import { ExportPanel } from './ExportPanel';
import { StampPanel } from './StampPanel';

interface Props {
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  sessionId: string;
  fields: TemplateField[];
  staticTexts: DocumentText[];
  stamps: StampPlacement[];
  stampAssets: StampAsset[];
  selectedStampId: string | null;
  selectedKey: string | null;
  selectedTextId: string | null;
  page: number;
  schema: Record<string, SignzyField>;
  sampleData: Record<string, string>;
  onSelect: (field: TemplateField) => void;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
  onUpdate: (index: number, patch: Partial<TemplateField>) => void;
  onAdd: (field: { key: string; label: string; type: FieldType }) => void;
  onFixDuplicates: () => void;
  onLocateText: (item: DocumentText) => void;
  onUpdateText: (id: string, text: string) => void;
  onFieldViewChange: (view: 'fields' | 'content') => void;
  onUploadStamp: (asset: StampAsset) => void;
  onAddStamp: (asset: StampAsset, target?: TemplateField) => void;
  onSelectStamp: (id: string) => void;
  onDeleteStamp: (id: string) => void;
  onBeforeServerAction: () => Promise<boolean>;
  onPreview: (pages: string[]) => void;
  onDownload: (kind: 'template' | 'signzy_json' | 'blank' | 'bundle') => void;
  notify: (message: string, kind?: 'success' | 'error') => void;
}

export function ControlPanel(props: Props) {
  const tabs: { id: PanelTab; label: string; hint: string; icon: IconName }[] = [
    { id: 'fields', label: 'Fields', hint: String(props.fields.length), icon: 'fields' },
    { id: 'stamp', label: 'Sign', hint: 'Place', icon: 'sign' },
    { id: 'fill', label: 'Test', hint: 'Preview', icon: 'test' },
    { id: 'export', label: 'Export', hint: 'Deliver', icon: 'export' },
  ];
  return <section className="control-panel">
    <nav aria-label="Editor tools">{tabs.map((tab) => <button key={tab.id} className={props.tab === tab.id ? 'active' : ''} aria-current={props.tab === tab.id ? 'step' : undefined} onClick={() => props.onTab(tab.id)}><Icon name={tab.icon} size={17}/><span>{tab.label}</span><small>{tab.hint}</small></button>)}</nav>
    <div className="control-content">
      {props.tab === 'fields' && <FieldsPanel fields={props.fields} staticTexts={props.staticTexts} currentPage={props.page} selectedKey={props.selectedKey} selectedTextId={props.selectedTextId} onSelect={props.onSelect} onDelete={props.onDelete} onDuplicate={props.onDuplicate} onUpdate={props.onUpdate} onAdd={props.onAdd} onFixDuplicates={props.onFixDuplicates} onLocateText={props.onLocateText} onUpdateText={props.onUpdateText} onViewChange={props.onFieldViewChange} />}
      {props.tab === 'stamp' && <StampPanel fields={props.fields} placements={props.stamps} selectedId={props.selectedStampId} page={props.page} customAssets={props.stampAssets} onUploadAsset={props.onUploadStamp} onAdd={props.onAddStamp} onSelect={props.onSelectStamp} onDelete={props.onDeleteStamp} notify={props.notify} />}
      {props.tab === 'fill' && <FillPanel sessionId={props.sessionId} fields={props.fields} sampleData={props.sampleData} onPreview={props.onPreview} onBeforeServerAction={props.onBeforeServerAction} notify={props.notify} />}
      {props.tab === 'export' && <ExportPanel fields={props.fields} schema={props.schema} onDownload={props.onDownload} notify={props.notify} />}
    </div>
  </section>;
}
