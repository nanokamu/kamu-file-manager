export interface UnifiedResource {
  path: string;
  name: string;
  type: 'file' | 'directory';
  mimeType?: string;
  size?: number;
  updatedAt: string;
}
