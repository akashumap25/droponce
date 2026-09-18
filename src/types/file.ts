export type FileStatus = 'active' | 'downloaded' | 'expired' | 'deleted';

export interface FileRecord {
  id: string;
  tokenHash: string;
  originalFilename: string;
  sanitizedFilename: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sessionId: string;
  isOneTime: boolean;
  status: FileStatus;
  downloadCount: number;
  createdAt: string;
  expiresAt: string;
  downloadedAt?: string | null;
}

export interface PublicFileMetadata {
  originalFilename: string;
  sanitizedFilename: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: string;
  isOneTime: boolean;
  status: FileStatus;
  createdAt: string;
}

export type UploadStep = 
  | 'idle'
  | 'preparing'
  | 'encrypting'
  | 'uploading'
  | 'finalizing'
  | 'success'
  | 'error';

export interface UploadProgressState {
  step: UploadStep;
  progress: number;
  message: string;
  error?: string;
}

export interface UploadResult {
  token: string;
  shareCode: string;
  shareUrl: string;
  expiresAt: string;
  isOneTime: boolean;
  filename: string;
  sizeBytes: number;
  mimeType: string;
}
export type DownloadScreenStatus = 
  | 'loading'
  | 'ready'
  | 'downloading'
  | 'consumed'
  | 'expired'
  | 'notFound'
  | 'error';

export interface DownloadState {
  status: DownloadScreenStatus;
  metadata?: PublicFileMetadata;
  error?: string;
  downloadProgress?: number;
}
