interface Props {
  filename: string;
  fieldCount: number;
  pageCount: number;
  dirty: boolean;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
}

export function EditorToolbar(props: Props) {
  return (
    <>
      <section className="document-title">
        <div>
          <small>DOCUMENT WORKSPACE</small>
          <h1>{props.filename}</h1>
          <p>{props.fieldCount} fields <i /> {props.pageCount} pages <i /> Editable PDF</p>
        </div>
        <span className={`save-state${props.dirty ? ' dirty' : ''}`}><i />{props.saving ? 'Saving…' : props.dirty ? 'Unsaved changes' : 'All changes saved'}</span>
      </section>
      <section className="editor-toolbar">
        <div><strong>Changes</strong><span>Use ⌘Z to undo and ⌘⇧Z to redo</span></div>
        <div className="toolbar-actions">
          <button className="button" disabled={!props.canUndo || props.saving} onClick={props.onUndo}>↶ Undo</button>
          <button className="button" disabled={!props.canRedo || props.saving} onClick={props.onRedo}>↷ Redo</button>
          <button className="button success" disabled={!props.dirty || props.saving} onClick={props.onSave}>Save changes</button>
        </div>
      </section>
    </>
  );
}
