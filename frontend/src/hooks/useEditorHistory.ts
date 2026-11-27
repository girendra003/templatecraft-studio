import { useCallback, useReducer } from 'react';
import type { DocumentText, StampPlacement, TemplateField } from '../types';

interface EditorSnapshot { fields: TemplateField[]; staticTexts: DocumentText[]; stamps: StampPlacement[]; }
interface State { snapshot: EditorSnapshot; saved: EditorSnapshot; undo: EditorSnapshot[]; redo: EditorSnapshot[]; }
type Action =
  | { type: 'reset'; snapshot: EditorSnapshot }
  | { type: 'save'; snapshot: EditorSnapshot }
  | { type: 'apply'; update: (current: EditorSnapshot) => EditorSnapshot; limit: number }
  | { type: 'undo'; limit: number }
  | { type: 'redo'; limit: number };
const empty: EditorSnapshot = { fields: [], staticTexts: [], stamps: [] };

// Immutable updates share unchanged arrays and image strings across history entries.
// A single reducer keeps history transitions atomic, including under StrictMode.
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'reset':
      return { snapshot: action.snapshot, saved: action.snapshot, undo: [], redo: [] };
    case 'save':
      return { ...state, snapshot: action.snapshot, saved: action.snapshot };
    case 'apply': {
      const next = action.update(state.snapshot);
      if (next === state.snapshot) return state;
      return { ...state, snapshot: next, undo: [...state.undo, state.snapshot].slice(-action.limit), redo: [] };
    }
    case 'undo': {
      if (!state.undo.length) return state;
      return {
        ...state,
        snapshot: state.undo.at(-1)!,
        undo: state.undo.slice(0, -1),
        redo: [...state.redo, state.snapshot].slice(-action.limit),
      };
    }
    case 'redo': {
      if (!state.redo.length) return state;
      return {
        ...state,
        snapshot: state.redo.at(-1)!,
        redo: state.redo.slice(0, -1),
        undo: [...state.undo, state.snapshot].slice(-action.limit),
      };
    }
    default:
      return state;
  }
}

export function useEditorHistory(limit = 50) {
  const [state, dispatch] = useReducer(reducer, { snapshot: empty, saved: empty, undo: [], redo: [] });
  const reset = useCallback((fields: TemplateField[], staticTexts: DocumentText[] = [], stamps: StampPlacement[] = []) => dispatch({ type: 'reset', snapshot: { fields, staticTexts, stamps } }), []);
  const applyFields = useCallback((updater: (fields: TemplateField[]) => TemplateField[]) => dispatch({ type: 'apply', limit, update: (current) => ({ ...current, fields: updater(current.fields) }) }), [limit]);
  const applyStaticTexts = useCallback((updater: (items: DocumentText[]) => DocumentText[]) => dispatch({ type: 'apply', limit, update: (current) => ({ ...current, staticTexts: updater(current.staticTexts) }) }), [limit]);
  const applyStamps = useCallback((updater: (items: StampPlacement[]) => StampPlacement[]) => dispatch({ type: 'apply', limit, update: (current) => ({ ...current, stamps: updater(current.stamps) }) }), [limit]);
  const undo = useCallback(() => dispatch({ type: 'undo', limit }), [limit]);
  const redo = useCallback(() => dispatch({ type: 'redo', limit }), [limit]);
  const markSaved = useCallback((fields: TemplateField[], staticTexts: DocumentText[], stamps: StampPlacement[]) => dispatch({ type: 'save', snapshot: { fields, staticTexts, stamps } }), []);
  return { ...state.snapshot, dirty: state.snapshot !== state.saved, canUndo: !!state.undo.length, canRedo: !!state.redo.length, reset, applyFields, applyStaticTexts, applyStamps, undo, redo, markSaved };
}
