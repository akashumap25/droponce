import React from 'react';
import { UploadDropzone } from './UploadDropzone';
import { UploadProgress } from './UploadProgress';
import { UploadSuccess } from './UploadSuccess';
import type { UploadResult, UploadProgressState } from '../types/file';

interface HeroProps {
  uploadState: UploadProgressState;
  uploadResult: UploadResult | null;
  selectedFile: File | null;
  quotaUsedBytes: number;
  quotaMaxBytes: number;
  onFileSelected: (file: File, isOneTime: boolean) => void;
  onReset: () => void;
  onCancelUpload: () => void;
  onNavigateToDownload: (token: string) => void;
}

export const Hero: React.FC<HeroProps> = ({
  uploadState,
  uploadResult,
  selectedFile,
  quotaUsedBytes,
  quotaMaxBytes,
  onFileSelected,
  onReset,
  onCancelUpload,
  onNavigateToDownload,
}) => {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden min-h-[90vh] flex flex-col items-center justify-center">
      {/* Cinematic ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-[#0050FF]/15 via-[#00D6FF]/10 to-transparent rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto w-full text-center relative z-10">
        {/* Subtle pill tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-white/70 mb-6 backdrop-blur-md animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00D6FF]" />
          <span>No accounts • 24-hour self-destruction • Zero logs</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.08] mb-6 animate-fade-in">
          Share it. <br className="hidden sm:inline" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/60">
            Then forget it.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-white/60 max-w-xl mx-auto mb-12 font-normal leading-relaxed animate-fade-in">
          Temporary file sharing built for uncompromising privacy. 
          Upload a file, generate a secure link, and share. 
          It vanishes when it expires or once downloaded.
        </p>

        {/* Dynamic Card State: Idle Dropzone / Uploading / Success */}
        <div className="w-full flex justify-center">
          {uploadState.step === 'idle' && !uploadResult && (
            <UploadDropzone
              onFileSelected={onFileSelected}
              quotaUsedBytes={quotaUsedBytes}
              quotaMaxBytes={quotaMaxBytes}
            />
          )}

          {uploadState.step !== 'idle' && uploadState.step !== 'success' && selectedFile && (
            <UploadProgress
              filename={selectedFile.name}
              sizeBytes={selectedFile.size}
              progress={uploadState.progress}
              stepMessage={uploadState.message}
              onCancel={onCancelUpload}
            />
          )}

          {uploadResult && (
            <UploadSuccess
              result={uploadResult}
              onReset={onReset}
              onNavigateToDownload={onNavigateToDownload}
            />
          )}
        </div>
      </div>
    </section>
  );
};
