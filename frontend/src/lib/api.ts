import type { AnalysisResponse, DocumentText, SaveResponse, StampAsset, StampPlacement, TemplateField } from '../types';

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || data.message || 'Request failed');
  return data as T;
}

export const api = {
  loadSample: () => jsonRequest<AnalysisResponse>('/api/sample'),

  uploadPdf: async (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return jsonRequest<AnalysisResponse>('/api/upload', { method: 'POST', body });
  },

  saveWorkspace: (sessionId: string, fields: TemplateField[], staticTexts: DocumentText[], stamps: StampPlacement[]) =>
    jsonRequest<SaveResponse>('/api/fields/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, fields, static_texts: staticTexts, stamp_placements: stamps }),
    }),

  listStamps: async () => {
    const result = await jsonRequest<{ success: boolean; stamps: StampAsset[] }>('/api/stamp/list');
    return result.stamps;
  },

  fillTest: (sessionId: string, data: Record<string, string>, flatten = true, matchSourceFormat = true) =>
    jsonRequest<{ preview_base64: string; pages_previews_base64: string[]; pdf_base64: string }>(
      `/api/fill-test/${sessionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, flatten, match_source_format: matchSourceFormat }),
      },
    ),

  downloadUrl: (sessionId: string, kind: 'template' | 'signzy_json' | 'blank' | 'bundle') =>
    `/api/download/${sessionId}/${kind}`,
};
