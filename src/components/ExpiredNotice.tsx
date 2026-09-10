import React from 'react';
import { Clock, ArrowLeft } from 'lucide-react';

interface ExpiredNoticeProps {
  onGoHome: () => void;
  message?: string;
}

export const ExpiredNotice: React.FC<ExpiredNoticeProps> = ({
  onGoHome,
  message = 'This temporary file is no longer available. The file has been permanently deleted.',
}) => {
  return (
    <div className="w-full max-w-md mx-auto p-8 sm:p-10 rounded-3xl bg-[#0A0A0C] border border-white/10 shadow-2xl text-center animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-6">
        <Clock className="w-8 h-8" />
      </div>

      <span className="text-[11px] font-mono uppercase tracking-widest text-red-400 font-semibold mb-2 block">
        Unavailable
      </span>

      <h3 className="text-2xl font-bold text-white tracking-tight mb-3">Link Expired</h3>

      <p className="text-xs sm:text-sm text-white/50 mb-8 leading-relaxed">
        {message}
      </p>

      <button
        onClick={onGoHome}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all active:scale-95 shadow-lg shadow-white/5"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Home</span>
      </button>
    </div>
  );
};
