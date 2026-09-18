import type { FileService } from './types';
import type { PublicFileMetadata, UploadResult, UploadStep } from '../types/file';
import { generateSecureToken, sha256Hex, getOrCreateSessionId } from '../utils/crypto';
import { sanitizeFilename } from '../utils/formatters';
import { MAX_FILE_SIZE_BYTES, MAX_SESSION_QUOTA_BYTES } from '../utils/mime';

interface StoredSimulatedFile {
  id: string;
  tokenHash: string;
  originalFilename: string;
  sanitizedFilename: string;
  mimeType: string;
  sizeBytes: number;
  sessionId: string;
  isOneTime: boolean;
  status: 'active' | 'downloaded' | 'expired' | 'deleted';
  downloadCount: number;
  createdAt: string;
  expiresAt: string;
  downloadedAt?: string | null;
  blob: Blob;
}

// In-Memory & IndexedDB storage backing
const DB_NAME = 'droponce_sim_vault';
const STORE_NAME = 'files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'tokenHash' });
        store.createIndex('sessionId', 'sessionId', { unique: false });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class MockFileService implements FileService {
  cancelUpload(): void {
    // Mock uploads are simulated synchronously and have no network request to abort.
  }

  async getSessionQuota(): Promise<{ usedBytes: number; maxBytes: number }> {
    const db = await openDB();
    const sessionId = getOrCreateSessionId();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);

      request.onsuccess = () => {
        const files: StoredSimulatedFile[] = request.result || [];
        const now = Date.now();
        let usedBytes = 0;

        for (const file of files) {
          const isExpired = new Date(file.expiresAt).getTime() <= now;
          if (file.status === 'active' && !isExpired) {
            usedBytes += file.sizeBytes;
          }
        }

        resolve({
          usedBytes,
          maxBytes: MAX_SESSION_QUOTA_BYTES,
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  async uploadFile(
    file: File,
    isOneTime: boolean,
    onProgress: (step: UploadStep, progress: number, message: string) => void
  ): Promise<UploadResult> {
    // 1. Client & Server size validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File exceeds the maximum allowed size of 50 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
    }

    if (file.size === 0) {
      throw new Error('Empty files cannot be shared.');
    }

    // 2. Quota check
    const quota = await this.getSessionQuota();
    if (quota.usedBytes + file.size > MAX_SESSION_QUOTA_BYTES) {
      const remainingMB = ((MAX_SESSION_QUOTA_BYTES - quota.usedBytes) / (1024 * 1024)).toFixed(1);
      throw new Error(
        `Session quota exceeded (100 MB max). You have ${remainingMB} MB remaining. Wait for existing files to expire or be consumed.`
      );
    }

    // Step: Preparing
    onProgress('preparing', 10, 'Validating file and session quota...');
    await new Promise(r => setTimeout(r, 400));

    // Step: Encrypting
    onProgress('encrypting', 35, 'Generating cryptographic 256-bit token & hash...');
    const rawToken = generateSecureToken();
    const shareCode = rawToken.slice(0, 10);
    const tokenHash = await sha256Hex(rawToken);
    await new Promise(r => setTimeout(r, 500));

    // Step: Uploading
    onProgress('uploading', 60, 'Privately transferring to isolated storage vault...');
    await new Promise(r => setTimeout(r, 600));

    onProgress('uploading', 85, 'Verifying object integrity and access rules...');
    await new Promise(r => setTimeout(r, 400));

    // Step: Finalizing
    onProgress('finalizing', 95, 'Sealing temporary record and generating secure link...');
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const sanitized = sanitizeFilename(file.name);

    const record: StoredSimulatedFile = {
      id: crypto.randomUUID(),
      tokenHash,
      originalFilename: file.name,
      sanitizedFilename: sanitized,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      sessionId: getOrCreateSessionId(),
      isOneTime,
      status: 'active',
      downloadCount: 0,
      createdAt: now.toISOString(),
      expiresAt,
      downloadedAt: null,
      blob: file, // Store actual blob in local client DB for testing
    };

    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    onProgress('success', 100, 'Secure temporary link generated.');

    // Build public shareable URL using current window origin
    const shareUrl = `${window.location.origin}/s/${shareCode}`;

    return {
      token: rawToken,
      shareCode,
      shareUrl,
      expiresAt,
      isOneTime,
      filename: sanitized,
      sizeBytes: file.size,
      mimeType: file.type || 'application/octet-stream',
    };
  }

  async getFileMetadata(rawToken: string): Promise<PublicFileMetadata> {
    const tokenHash = await sha256Hex(rawToken);
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(tokenHash);

      req.onsuccess = () => {
        const file: StoredSimulatedFile | undefined = req.result;

        if (!file) {
          reject(new Error('This temporary file link does not exist or has been deleted.'));
          return;
        }

        const now = Date.now();
        const isExpired = new Date(file.expiresAt).getTime() <= now;

        if (isExpired && file.status === 'active') {
          // Mark as expired and drop blob
          file.status = 'expired';
          file.blob = new Blob();
          store.put(file);
          reject(new Error('This temporary link has expired (24-hour limit exceeded).'));
          return;
        }

        if (file.status === 'expired') {
          reject(new Error('This temporary link has expired. The file has been permanently deleted.'));
          return;
        }

        if (file.status === 'downloaded' && file.isOneTime) {
          reject(new Error('This temporary file was configured for one-time use and has already been downloaded.'));
          return;
        }

        if (file.status === 'deleted') {
          reject(new Error('This file has been deleted.'));
          return;
        }

        resolve({
          originalFilename: file.originalFilename,
          sanitizedFilename: file.sanitizedFilename,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          expiresAt: file.expiresAt,
          isOneTime: file.isOneTime,
          status: file.status,
          createdAt: file.createdAt,
        });
      };

      req.onerror = () => reject(req.error);
    });
  }

  async downloadFile(
    rawToken: string,
    onProgress?: (progress: number) => void
  ): Promise<{ blob: Blob; filename: string; mimeType: string }> {
    const tokenHash = await sha256Hex(rawToken);
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(tokenHash);

      req.onsuccess = async () => {
        const file: StoredSimulatedFile | undefined = req.result;

        if (!file) {
          reject(new Error('File not found or already deleted.'));
          return;
        }

        const now = Date.now();
        if (new Date(file.expiresAt).getTime() <= now) {
          file.status = 'expired';
          file.blob = new Blob();
          store.put(file);
          reject(new Error('This link has expired and is no longer available.'));
          return;
        }

        if (file.status === 'downloaded' && file.isOneTime) {
          reject(new Error('This one-time link has already been consumed.'));
          return;
        }

        if (file.status !== 'active') {
          reject(new Error('This file is not available for download.'));
          return;
        }

        // Simulate streaming progress for realistic feedback
        if (onProgress) {
          onProgress(20);
          await new Promise(r => setTimeout(r, 200));
          onProgress(60);
          await new Promise(r => setTimeout(r, 200));
          onProgress(100);
        }

        const downloadedBlob = file.blob;
        const filename = file.sanitizedFilename;
        const mimeType = file.mimeType;

        // Atomic lifecycle state transition:
        // If one-time, transition status to 'downloaded' and purge the blob from memory/DB!
        if (file.isOneTime) {
          file.status = 'downloaded';
          file.downloadCount += 1;
          file.downloadedAt = new Date().toISOString();
          file.blob = new Blob(); // Purge payload
          store.put(file);
        } else {
          file.downloadCount += 1;
          file.downloadedAt = new Date().toISOString();
          store.put(file);
        }

        resolve({
          blob: downloadedBlob,
          filename,
          mimeType,
        });
      };

      req.onerror = () => reject(req.error);
    });
  }
}
