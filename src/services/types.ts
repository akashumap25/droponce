import type { PublicFileMetadata, UploadResult, UploadStep } from '../types/file';

export interface FileService {
  uploadFile(
    file: File,
    isOneTime: boolean,
    onProgress: (step: UploadStep, progress: number, message: string) => void
  ): Promise<UploadResult>;

  getFileMetadata(token: string): Promise<PublicFileMetadata>;

  downloadFile(
    token: string,
    onProgress?: (progress: number) => void
  ): Promise<{ blob: Blob; filename: string; mimeType: string }>;

  getSessionQuota(): Promise<{ usedBytes: number; maxBytes: number }>;
  cancelUpload(): void;
}
