export type FieldType = 'text' | 'textarea' | 'date' | 'time' | 'checkbox' | 'image' | 'signature';

export interface DocumentText {
  id: string;
  page_no: number;
  text: string;
  original_text: string;
  bbox: [number, number, number, number];
  font_size: number;
  source_font?: string;
  font_family?: string;
  font_style?: string;
  font_color?: string;
  pdf_font?: string;
}

export interface TemplateField {
  key: string;
  label: string;
  description?: string;
  section: string;
  type: FieldType | string;
  bbox: [number, number, number, number];
  page_no: number;
  width?: number;
  height?: number;
  sample_value?: string;
  font_size?: number | null;
  source_font?: string | null;
  font_family?: string | null;
  font_style?: string | null;
  font_color?: string;
  pdf_font?: string;
  widget_font?: string;
  font_detected?: boolean;
  font_match_note?: string;
}

export interface SignzyField {
  type: string;
  value?: string;
  pageNo: number;
  dimensions?: {
    xCoordinate: number;
    yCoordinate: number;
    width: number;
    height: number;
  };
}

export interface AnalysisResponse {
  success: boolean;
  session_id: string;
  filename: string;
  page_count: number;
  total_fields: number;
  fields: TemplateField[];
  static_texts: DocumentText[];
  signzy_schema: Record<string, SignzyField>;
  sample_data: Record<string, string>;
  preview_base64: string;
  visual_map_base64: string;
  pages_previews_base64: string[];
  pages_base_previews_base64?: string[];
  pages_visual_maps_base64: string[];
  stamp_placements?: StampPlacement[];
  stamps_applied?: AppliedStamp[];
}

export interface SaveResponse {
  success: boolean;
  total_fields: number;
  fields: TemplateField[];
  static_texts: DocumentText[];
  signzy_schema: Record<string, SignzyField>;
  sample_data: Record<string, string>;
  pages_visual_maps_base64: string[];
  pages_previews_base64: string[];
  pages_base_previews_base64: string[];
  stamp_placements: StampPlacement[];
}

export interface StampAsset {
  id: string;
  filename: string;
  label: string;
  mime_type: string;
  image_base64: string;
}

export interface StampPlacement {
  id: string;
  asset_id: string;
  name: string;
  mime_type: string;
  image_base64: string;
  page_no: number;
  bbox: [number, number, number, number];
}

export interface AppliedStamp {
  key?: string;
  name?: string;
  page_no: number;
  rect: [number, number, number, number];
}

export type PanelTab = 'fields' | 'stamp' | 'fill' | 'export';
export type PreviewMode = 'edit' | 'clean' | 'filled';
export type PageLayout = 'single' | 'continuous';
