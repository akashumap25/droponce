import React from 'react';
import { Lock, FileCheck, XCircle } from 'lucide-react';
import { formatBytes } from '../utils/formatters';
import { categorizeFile } from '../utils/mime';

interface UploadProgressProps {
  filename: string;
  sizeBytes: number;
  progress: number;
  stepMessage: string;
  onCancel?: () => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  filename,
  sizeBytes,
  progress,
  stepMessage,
  onCancel,
}) => {
  const typeInfo = categorizeFile(filename);

  return (
    <div className="w-full max-w-xl mx-auto p-8 rounded-3xl bg-[#0A0A0C] border border-white/10 shadow-2xl animate-fade-in relative overflow-hidden">
      {/* Background soft glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#0050FF]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#00D6FF]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-[#00D6FF] animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white tracking-tight">Securing Transfer</h4>
            <p className="text-xs text-white/50">Zero-footprint isolated upload</p>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Cancel upload"
            title="Cancel upload"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* File Info Card */}
      <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-8 relative z-10">
        <div className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono bg-gradient-to-br ${typeInfo.color} border border-white/10`}>
          {typeInfo.label}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{filename}</p>
          <p className="text-xs text-white/50 font-mono">{formatBytes(sizeBytes)}</p>
        </div>
        <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
      </div>

      {/* Progress Bar & Percentage */}
      <div className="mb-4 relative z-10">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-white/70 font-medium">{stepMessage}</span>
          <span className="text-[#00D6FF] font-mono font-semibold">{Math.round(progress)}%</span>
        </div>

        <div className="w-full h-2.5 bg-white/[0.06] rounded-full overflow-hidden p-0.5 border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-[#0050FF] via-[#00A3FF] to-[#00D6FF] rounded-full transition-all duration-300 relative"
            style={{ width: `${Math.max(5, progress)}%` }}
          >
            {/* Shimmer pulse effect */}
            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
          </div>
        </div>
      </div>

      {/* Bottom Microcopy */}
      <div className="text-center relative z-10">
        <p className="text-[11px] text-white/40 font-mono tracking-wide uppercase">
          Encrypting payload • Ephemeral token minting
        </p>
      </div>
    </div>
  );
};
