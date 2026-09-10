import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-16 px-6 border-t border-white/[0.08] bg-[#050505] text-xs text-white/50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Brand info */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-white">DROPONCE</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span className="font-mono text-[11px] text-[#00D6FF]">Upload. Share. Gone.</span>
          </div>
          <p className="text-[11px] text-white/40 max-w-sm">
            Private file sharing, without the permanent footprint. Automatic deletion upon expiration or first download.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-white/60">
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#security" className="hover:text-white transition-colors">Security</a>
          <a href="#specifications" className="hover:text-white transition-colors">Specifications</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>

        {/* Status / Copyright */}
        <div className="flex flex-col items-center md:items-end gap-1.5 text-center md:text-right">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Ephemeral Vault Online</span>
          </div>
          <p className="text-[10px] text-white/30 font-mono">
            © 2026 DROPONCE • All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
