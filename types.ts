export interface BrandingConfig {
  brandProfile: 'custom' | 'rapsodo';
  primaryColor: string;
  secondaryColor: string;
  fontStyle: 'modern' | 'classic' | 'playful' | 'athletic';
  toneOfVoice: string;
  contentType: 'email' | 'landing_page' | 'social_post';
  imageStyle: 'none' | 'placeholder' | 'upload' | 'ai_generated';
}

export type AssetTag = 'hero' | 'product' | 'lifestyle' | 'logo' | 'chart' | 'icon' | 'other' | 'do_not_use';

export interface UploadedAsset {
  id: string;
  data: string; // Base64 string
  name: string;
  tag: AssetTag;
  width?: number;
  height?: number;
}

export interface GuidelinesConfig {
  rapsodoGuidelines: string;
  webEngineering: string;
  emailEngineering: string;
  agentLogic: string;
}

export interface GeneratedAsset {
  rewrittenCopy: string;
  htmlLayout: string;
  explanation: string;
  imagePrompts?: string[];
}

export interface GenerationState {
  isLoading: boolean;
  statusMessage?: string;
  error: string | null;
  data: GeneratedAsset | null;
}