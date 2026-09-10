import React, { useState, useEffect } from 'react';
import { Download, ShieldCheck, Clock, Flame, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { fileService } from '../services/fileService';
import type { PublicFileMetadata, DownloadScreenStatus } from '../types/file';
import { formatBytes, getTimeRemaining } from '../utils/formatters';
import { categorizeFile } from '../utils/mime';
import { useToast } from '../context/ToastContext';
import { ExpiredNotice } from './ExpiredNotice';
import { ConsumedNotice } from './ConsumedNotice';

interface DownloadPageProps {
  token: string;
  onGoHome: () => void;
}

export const DownloadPage: React.FC<DownloadPageProps> = ({ token, onGoHome }) => {
  const [status, setStatus] = useState<DownloadScreenStatus>('loading');
  const [metadata, setMetadata] = useState<PublicFileMetadata | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const { showToast } = useToast();

  useEffect(() => {
    let isMounted = true;

    async function loadMetadata() {
      try {
        setStatus('loading');
        const data = await fileService.getFileMetadata(token);
        if (!isMounted) return;

        setMetadata(data);
        setStatus('ready');
      } catch (err: any) {
        if (!isMounted) return;
        const msg = err.message || 'File not found or expired.';
        setErrorMessage(msg);

        if (msg.toLowerCase().includes('expired')) {
          setStatus('expired');
        } else if (msg.toLowerCase().includes('consumed') || msg.toLowerCase().includes('already been downloaded')) {
          setStatus('consumed');
        } else {
          setStatus('notFound');
        }
      }
    }

    loadMetadata();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Live expiration timer countdown
  useEffect(() => {
    if (!metadata) return;

    const updateTimer = () => {
      const remaining = getTimeRemaining(metadata.expiresAt);
      if (remaining.isExpired) {
        setStatus('expired');
      } else {
        setTimeRemaining(remaining.formatted);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [metadata]);

  const handleDownload = async () => {
    if (!metadata || status === 'downloading') return;

    try {
      setStatus('downloading');
      setDownloadProgress(10);

      const result = await fileService.downloadFile(token, (progress) => {
        setDownloadProgress(progress);
      });

      // Deliver blob to user
      const downloadUrl = window.URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      showToast('Download started successfully', 'success');

      if (metadata.isOneTime) {
        setStatus('consumed');
      } else {
        setStatus('ready');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to download file', 'error');
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-[#00D6FF] animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-white">Validating Security Token</h3>
        <p className="text-xs text-white/50 font-mono mt-1">Verifying unguessable 256-bit hash on server...</p>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <ExpiredNotice onGoHome={onGoHome} message={errorMessage} />
      </div>
    );
  }

  if (status === 'consumed') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <ConsumedNotice onGoHome={onGoHome} filename={metadata?.sanitizedFilename} />
      </div>
    );
  }

  if (status === 'notFound' || status === 'error') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[#0A0A0C] border border-white/10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Access Denied</h3>
          <p className="text-xs text-white/60 mb-6">{errorMessage || 'Invalid or deleted security token.'}</p>
          <button
            onClick={onGoHome}
            className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
          >
            Go to DROPONCE Home
          </button>
        </div>
      </div>
    );
  }

  const typeInfo = categorizeFile(metadata?.originalFilename || '');

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 animate-fade-in relative">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-[#0050FF]/15 via-[#00D6FF]/10 to-transparent rounded-full blur-[100px] pointer-events-none" />

      {/* Main Download Card */}
      <div className="w-full max-w-lg p-8 sm:p-10 rounded-3xl bg-[#0A0A0C] border border-white/10 shadow-2xl text-center relative z-10 overflow-hidden">
        {/* Top Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-[#00D6FF] mb-6">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>SECURE FILE DETECTED</span>
        </div>

        {/* File Name */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2 break-all">
          {metadata?.sanitizedFilename}
        </h2>

        {/* File Type & Size */}
        <div className="flex items-center justify-center gap-2 text-xs text-white/60 mb-8 font-mono">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-to-br ${typeInfo.color} border border-white/10`}>
            {typeInfo.label}
          </span>
          <span>•</span>
          <span>{formatBytes(metadata?.sizeBytes || 0)}</span>
        </div>

        {/* Security / Expiration Warning Notice */}
        <div className="p-4 rounded-2xl bg-[#050505] border border-white/5 mb-8 text-left space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-white/40" />
              Time Remaining:
            </span>
            <span className="font-mono text-white font-medium">{timeRemaining}</span>
          </div>

          {metadata?.isOneTime && (
            <div className="flex items-start gap-2 text-[11px] text-amber-300/90 pt-2 border-t border-white/5">
              <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Single-Use File:</strong> This temporary link will be instantly consumed and purged upon download.
              </span>
            </div>
          )}
        </div>

        {/* Primary Download Action Button */}
        <button
          onClick={handleDownload}
          disabled={status === 'downloading'}
          className={`w-full relative group py-4 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-xl active:scale-[0.98] ${
            status === 'downloading'
              ? 'bg-white/10 text-white/60 cursor-wait'
              : 'bg-gradient-to-r from-[#0050FF] to-[#00D6FF] text-white hover:opacity-95 shadow-blue-500/25'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            {status === 'downloading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#00D6FF]" />
                <span>Downloading... {downloadProgress}%</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                <span>Download File</span>
              </>
            )}
          </span>
        </button>

        {/* Progress Bar (Visible during download) */}
        {status === 'downloading' && (
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-[#00D6FF] transition-all duration-200"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        )}

        <p className="text-[11px] text-white/40 font-mono mt-4">
          Safe direct streaming • Verified cryptographic checksum
        </p>
      </div>

      {/* Return Home Link */}
      <button
        onClick={onGoHome}
        className="mt-8 flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Create your own secure temporary link</span>
      </button>
    </div>
  );
};
