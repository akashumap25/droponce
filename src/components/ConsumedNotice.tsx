import React from 'react';
import { Check, ArrowRight } from 'lucide-react';

interface ConsumedNoticeProps {
  onGoHome: () => void;
  filename?: string;
}

export const ConsumedNotice: React.FC<ConsumedNoticeProps> = ({ onGoHome, filename }) => {
  return (
    <div className="w-full max-w-md mx-auto p-8 sm:p-10 rounded-3xl bg-[#0A0A0C] border border-white/10 shadow-2xl text-center animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/10">
        <Check className="w-8 h-8" />
      </div>

      <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-semibold mb-2 block">
        Task Finished
      </span>

      <h3 className="text-2xl font-bold text-white tracking-tight mb-3">Download Complete</h3>

      {filename && (
        <p className="text-xs text-white/70 font-mono mb-2 truncate">
          {filename}
        </p>
      )}

      <p className="text-xs sm:text-sm text-white/50 mb-8 leading-relaxed">
        This temporary link has now been consumed. In accordance with zero-footprint security policy, the file has been purged from the storage vault.
      </p>

      <button
        onClick={onGoHome}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all active:scale-95 shadow-lg shadow-white/5"
      >
        <span>Share a File on DROPONCE</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
