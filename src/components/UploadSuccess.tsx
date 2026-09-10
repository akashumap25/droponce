import React, { useState, useEffect } from 'react';
import { Check, Copy, QrCode, ExternalLink, RefreshCw, Flame, Clock } from 'lucide-react';
import type { UploadResult } from '../types/file';
import { formatBytes, getTimeRemaining } from '../utils/formatters';
import { categorizeFile } from '../utils/mime';
import { useToast } from '../context/ToastContext';
import { QrCodeModal } from './QrCodeModal';

interface UploadSuccessProps {
  result: UploadResult;
  onReset: () => void;
  onNavigateToDownload?: (token: string) => void;
}

export const UploadSuccess: React.FC<UploadSuccessProps> = ({
  result,
  onReset,
  onNavigateToDownload,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const { showToast } = useToast();

  const typeInfo = categorizeFile(result.filename);

  useEffect(() => {
    const updateTime = () => {
      const remaining = getTimeRemaining(result.expiresAt);
      setTimeRemaining(remaining.formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [result.expiresAt]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.shareUrl);
      setCopied(true);
      showToast('Secure link copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-8 sm:p-10 rounded-3xl bg-[#0A0A0C] border border-white/10 shadow-2xl animate-fade-in relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Success Badge */}
      <div className="flex flex-col items-center text-center relative z-10 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400 shadow-lg shadow-emerald-500/20">
          <Check className="w-8 h-8" />
        </div>
        <span className="text-[11px] font-mono tracking-widest text-emerald-400 uppercase font-semibold mb-1">
          Secure Link Ready
        </span>
        <h3 className="text-2xl font-bold text-white tracking-tight">Ready to Share</h3>
        <p className="text-xs text-white/50 mt-1">
          Anyone with this private token can access your file within the parameters below.
        </p>
      </div>

      {/* File Card Info */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] mb-6 relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono bg-gradient-to-br ${typeInfo.color} border border-white/10 shrink-0`}>
            {typeInfo.label}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{result.filename}</p>
            <p className="text-xs text-white/50 font-mono">{formatBytes(result.sizeBytes)}</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
          {result.isOneTime ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <Flame className="w-3 h-3 text-amber-400" />
              1-Time Use
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300">
              Multi-Download
            </span>
          )}

          <div className="flex items-center gap-1 text-[11px] text-white/50 font-mono">
            <Clock className="w-3 h-3 text-white/40" />
            <span>{timeRemaining}</span>
          </div>
        </div>
      </div>

      {/* Shareable Link Box */}
      <div className="space-y-3 mb-6 relative z-10">
        <label className="block text-xs font-medium text-white/60">Temporary Access Link</label>
        <div className="flex items-center gap-2 p-2 bg-[#050505] rounded-2xl border border-white/10 focus-within:border-white/25 transition-colors">
          <input
            type="text"
            readOnly
            value={result.shareUrl}
            className="w-full bg-transparent px-3 text-xs font-mono text-white/90 select-all focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              copied
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-white text-black hover:bg-white/90 active:scale-95'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied ✓</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Secondary Actions: QR Code & Open Preview */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-6 border-b border-white/[0.08] relative z-10">
        <button
          onClick={() => setShowQrModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-white/80 hover:text-white transition-colors"
        >
          <QrCode className="w-4 h-4 text-[#00D6FF]" />
          <span>Mobile QR Code</span>
        </button>

        <button
          onClick={() => {
            if (onNavigateToDownload) {
              onNavigateToDownload(result.token);
            } else {
              window.open(`/s/${result.token}`, '_blank');
            }
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-white/80 hover:text-white transition-colors"
        >
          <span>Test Recipient View</span>
          <ExternalLink className="w-3.5 h-3.5 text-white/50" />
        </button>
      </div>

      {/* Share another file footer */}
      <div className="mt-6 flex justify-center relative z-10">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors py-1 px-3 rounded-lg hover:bg-white/5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Share another file</span>
        </button>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <QrCodeModal
          url={result.shareUrl}
          filename={result.filename}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
};
