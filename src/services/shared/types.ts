// Shared types and interfaces for all clipboard services

export interface ApiClip {
  id: number;
  content: string;
  timestamp: string; // ISO 8601
  from_app_name?: string | null;
  tags?: string[]; // server returns list of tag names
  is_favorite?: boolean; // favorite flag
}

export interface ApiClipInput {
  content: string;
  timestamp?: string; // Optional ISO 8601 timestamp - backend generates if not provided
  from_app_name?: string | null;
}

export interface ApiClips { clips: ApiClip[]; }

export interface ApiTag { id: number; name: string; }
export interface ApiTags { tags: ApiTag[]; }
export interface ApiFavoriteClipIDs { clip_ids: number[]; }
export interface ApiFromApps { apps: string[]; }

export type { ApiClip as ClipDTO };
export type { ApiClipInput as ClipInputDTO };
