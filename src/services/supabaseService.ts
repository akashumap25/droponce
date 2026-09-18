import { createClient } from '@supabase/supabase-js';
import type { FileService } from './types';
import type { PublicFileMetadata, UploadResult, UploadStep } from '../types/file';
import { getOrCreateSessionId } from '../utils/crypto';
import { MAX_FILE_SIZE_BYTES, MAX_SESSION_QUOTA_BYTES } from '../utils/mime';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${SUPABASE_URL}/functions/v1`;

export class SupabaseFileService implements FileService {
  private uploadCancelled = false;
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    };
  }

  async getSessionQuota(): Promise<{ usedBytes: number; maxBytes: number }> {
    const sessionId = getOrCreateSessionId();
    try {
      const res = await fetch(`${API_BASE_URL}/get-session-quota?sessionId=${encodeURIComponent(sessionId)}`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) {
        return { usedBytes: 0, maxBytes: MAX_SESSION_QUOTA_BYTES };
      }
      const data = await res.json();
      return {
        usedBytes: data.usedBytes || 0,
        maxBytes: MAX_SESSION_QUOTA_BYTES,
      };
    } catch {
      return { usedBytes: 0, maxBytes: MAX_SESSION_QUOTA_BYTES };
    }
  }
  cancelUpload(): void {
    this.uploadCancelled = true;
  }
  async uploadFile(
    file: File,
    isOneTime: boolean,
    onProgress: (step: UploadStep, progress: number, message: string) => void
  ): Promise<UploadResult> {
    this.uploadCancelled = false;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File exceeds the maximum allowed size of 50 MB.`);
    }

    onProgress('preparing', 15, 'Requesting secure upload authorization...');

    const sessionId = getOrCreateSessionId();
    const initRes = await fetch(`${API_BASE_URL}/initialize-upload`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        filename: file.name,
        sizeBytes: file.size,
        mimeType: file.type || 'application/octet-stream',
        isOneTime,
        sessionId,
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({ error: 'Failed to initialize upload' }));
      throw new Error(err.error || 'Server rejected upload initialization.');
    }

    const initData = await initRes.json();
    const { uploadToken, token, shareCode, storageKey } = initData;

    onProgress('uploading', 40, 'Uploading to encrypted private vault...');

    const storage = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: uploadError } = await storage.storage
      .from('droponce-files')
      .uploadToSignedUrl(storageKey, uploadToken, file, { contentType: file.type || 'application/octet-stream' });
    if (uploadError) throw new Error('Storage transfer failed.');
    onProgress('uploading', 85, 'Upload complete. Verifying file...');

    if (this.uploadCancelled) {
      throw new Error('Upload cancelled.');
    }

    onProgress('finalizing', 90, 'Verifying file and creating secure link...');

    const completeRes = await fetch(`${API_BASE_URL}/complete-upload`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        storageKey,
        token,
        filename: file.name,
        sizeBytes: file.size,
        mimeType: file.type || 'application/octet-stream',
        isOneTime,
        sessionId,
      }),
    });

    if (!completeRes.ok) {
      const err = await completeRes.json().catch(() => ({ error: 'Failed to finalize upload' }));
      throw new Error(err.error || 'Finalization error.');
    }

    const completeData = await completeRes.json();
    onProgress('success', 100, 'Secure temporary link generated.');

    const shareUrl = `${window.location.origin}/s/${shareCode}`;
    return {
  token,
  shareCode,
  shareUrl,
  expiresAt: completeData.expiresAt,
  isOneTime,
  filename: file.name,
  sizeBytes: file.size,
  mimeType: file.type || 'application/octet-stream',
};
  }

  async getFileMetadata(shareCode: string): Promise<PublicFileMetadata> {
  const res = await fetch(
    `${API_BASE_URL}/get-file-info?shareCode=${encodeURIComponent(shareCode)}`,
    {
      headers: this.getHeaders(),
    }
  );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'File not found or expired' }));
      throw new Error(err.error || 'This temporary file is no longer available.');
    }

    return await res.json();
  }

  async downloadFile(
    shareCode: string,
    onProgress?: (progress: number) => void
  ): Promise<{ blob: Blob; filename: string; mimeType: string }> {
    if (onProgress) onProgress(15);

    const res = await fetch(`${API_BASE_URL}/download-file`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ shareCode }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(err.error || 'Failed to download file.');
    }

    if (onProgress) onProgress(60);

    const data = await res.json();
    const downloadUrl = data.downloadUrl;
    const filename = data.filename;
    const mimeType = data.mimeType;

    // Fetch actual file stream
    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) {
      throw new Error('Could not retrieve file content from storage.');
    }

    if (onProgress) onProgress(90);

    const blob = await fileRes.blob();
    if (onProgress) onProgress(100);

    return { blob, filename, mimeType };
  }
}
