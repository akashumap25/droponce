import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, Shield, Clock, Flame, HardDrive } from 'lucide-react';
import { MAX_FILE_SIZE_BYTES } from '../utils/mime';
import { formatBytes } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

interface UploadDropzoneProps {
  onFileSelected: (file: File, isOneTime: boolean) => void;
  quotaUsedBytes: number;
  quotaMaxBytes: number;
  disabled?: boolean;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFileSelected,
  quotaUsedBytes,
  quotaMaxBytes,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isOneTime, setIsOneTime] = useState<boolean>(true);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dropzoneRef.current) return;
    const rect = dropzoneRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  }, []);

  const validateAndSelectFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      showToast(`File size (${formatBytes(file.size)}) exceeds 100 MB limit`, 'error');
      return;
    }
    if (file.size === 0) {
      showToast('Cannot upload empty files', 'error');
      return;
    }
    if (quotaUsedBytes + file.size > quotaMaxBytes) {
      showToast(`Session storage quota exceeded (100 MB max)`, 'error');
      return;
    }
    onFileSelected(file, isOneTime);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSelectFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSelectFile(file);
    }
  };

  const quotaPercent = Math.min(100, Math.round((quotaUsedBytes / quotaMaxBytes) * 100));

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Dropzone Card */}
      <div
        ref={dropzoneRef}
        onMouseMove={handleMouseMove}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label="Upload temporary file dropzone"
        className={`relative group cursor-pointer rounded-3xl p-8 sm:p-12 transition-all duration-300 overflow-hidden outline-none ${
          isDragging
            ? 'scale-[1.02] border-[#00D6FF] shadow-2xl shadow-[#00D6FF]/20 bg-[#0A0A10]'
            : 'border border-white/10 hover:border-white/20 bg-[#0A0A0C]/80 hover:bg-[#0E0E12] shadow-2xl'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        style={{
          backgroundImage: `radial-gradient(circle 350px at ${mousePos.x}% ${mousePos.y}%, rgba(0, 80, 255, 0.12), rgba(0, 214, 255, 0.04) 50%, transparent 80%)`,
        }}
      >
        {/* Animated ambient border highlight on drag */}
        {isDragging && (
          <div className="absolute inset-0 border-2 border-[#00D6FF] rounded-3xl animate-pulse pointer-events-none" />
        )}

        {/* Hidden input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
          tabIndex={-1}
        />

        <div className="flex flex-col items-center justify-center text-center relative z-10 pointer-events-none">
          {/* Reactive Central Icon */}
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${
              isDragging
                ? 'bg-[#00D6FF]/20 text-[#00D6FF] scale-110 shadow-lg shadow-[#00D6FF]/30'
                : 'bg-white/[0.04] text-white/80 group-hover:text-white group-hover:scale-105 group-hover:bg-white/[0.08] border border-white/10'
            }`}
          >
            <UploadCloud className="w-10 h-10 transition-transform group-hover:-translate-y-1" />
          </div>

          {/* Headline & Subtitle */}
          <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight mb-2">
            {isDragging ? (
              <span className="text-[#00D6FF]">RELEASE TO SECURE</span>
            ) : (
              <span>Drop your file here</span>
            )}
          </h3>

          <p className="text-sm text-white/50 mb-8 max-w-sm">
            {isDragging
              ? 'File will be encrypted and assigned an ephemeral link'
              : 'or click to browse from your computer'}
          </p>

          {/* Quick Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-white/60">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08]">
              <HardDrive className="w-3.5 h-3.5 text-[#00D6FF]" />
              Up to 50 MB
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08]">
              <Clock className="w-3.5 h-3.5 text-[#0050FF]" />
              Auto-delete in 24h
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08]">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Zero Logs
            </span>
          </div>
        </div>
      </div>

      {/* Upload Controls & Quota Indicator */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
        {/* One-Time Consumption Switch */}
        <div
          onClick={() => setIsOneTime(!isOneTime)}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/15 cursor-pointer transition-colors w-full sm:w-auto"
          role="checkbox"
          aria-checked={isOneTime}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOneTime(!isOneTime);
            }
          }}
        >
          <div
            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              isOneTime
                ? 'bg-[#00D6FF] border-[#00D6FF] text-black'
                : 'border-white/30 bg-transparent'
            }`}
          >
            {isOneTime && <span className="text-[10px] font-bold">✓</span>}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/80 select-none">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium">Self-destruct after 1st download</span>
          </div>
        </div>

        {/* Anonymous Session Quota */}
        <div className="flex items-center gap-3 text-xs text-white/50 w-full sm:w-auto justify-end">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5">
              <span>Session Quota:</span>
              <span className="font-mono text-white/80 font-medium">
                {formatBytes(quotaUsedBytes)} / {formatBytes(quotaMaxBytes)}
              </span>
            </div>
            <div className="w-28 h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-[#0050FF] to-[#00D6FF] transition-all duration-500 rounded-full"
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
