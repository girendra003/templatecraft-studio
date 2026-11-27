import { useEffect, useRef } from 'react';
export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  return <dialog ref={dialog} className="shortcuts-dialog" onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-heading"><div><span className="eyebrow">WORK A LITTLE FASTER</span><h2>Keyboard shortcuts</h2></div><button className="button icon-button" onClick={onClose} aria-label="Close shortcuts">×</button></div>
    <p>Use ⌘ on Mac or Ctrl on Windows and Linux.</p>
    <dl>{[['Save changes', '⌘ / Ctrl + S'], ['Undo', '⌘ / Ctrl + Z'], ['Redo', '⌘ / Ctrl + Shift + Z'], ['Duplicate selected field', '⌘ / Ctrl + D'], ['Move selected field', 'Arrow keys'], ['Move by 10 points', 'Shift + Arrow'], ['Clear selection / close', 'Esc'], ['Show shortcuts', '?']].map(([label, key]) => <div key={label}><dt>{label}</dt><dd><kbd>{key}</kbd></dd></div>)}</dl>
    <small>Field shortcuts work in Edit fields mode, outside text inputs.</small>
  </dialog>;
}
