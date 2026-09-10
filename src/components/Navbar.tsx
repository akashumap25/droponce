import React, { useState, useEffect } from 'react';
import { ShieldCheck, Menu, X, ArrowUpRight } from 'lucide-react';

interface NavbarProps {
  onStartUpload?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onStartUpload }) => {
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-[#050505]/80 backdrop-blur-xl border-b border-white/[0.08] py-3.5 shadow-2xl'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        {/* Brand Logo */}
        <a 
          href="/" 
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D6FF] rounded-lg"
          aria-label="DROPONCE home"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0050FF] to-[#00D6FF] p-[1px] shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/35 transition-all">
            <div className="w-full h-full bg-[#050505] rounded-[7px] flex items-center justify-center">
              <span className="text-white font-extrabold text-sm tracking-tighter">D</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-white group-hover:text-white/90 transition-colors">
                DROPONCE
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="System Operational" />
            </div>
            <span className="text-[10px] text-white/40 tracking-wider font-mono uppercase">Ephemeral Vault</span>
          </div>
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-white/60" aria-label="Main Navigation">
          <button 
            onClick={() => scrollToSection('how-it-works')} 
            className="hover:text-white transition-colors focus:outline-none focus:text-white"
          >
            How it works
          </button>
          <button 
            onClick={() => scrollToSection('security')} 
            className="hover:text-white transition-colors focus:outline-none focus:text-white"
          >
            Security
          </button>
          <button 
            onClick={() => scrollToSection('specifications')} 
            className="hover:text-white transition-colors focus:outline-none focus:text-white"
          >
            Specs
          </button>
          <button 
            onClick={() => scrollToSection('faq')} 
            className="hover:text-white transition-colors focus:outline-none focus:text-white"
          >
            FAQ
          </button>
        </nav>

        {/* Primary CTA */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-white/50">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00D6FF]" />
            <span>Zero Footprint</span>
          </div>
          <button
            onClick={() => {
              if (onStartUpload) onStartUpload();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="relative group overflow-hidden px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all shadow-md shadow-white/10 active:scale-95"
          >
            <span className="flex items-center gap-1">
              Share a file
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </button>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Toggle mobile menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-6 pt-4 pb-6 bg-[#0A0A0C]/95 backdrop-blur-2xl border-b border-white/10 animate-fade-in">
          <div className="flex flex-col gap-4 text-sm font-medium text-white/70">
            <button 
              onClick={() => scrollToSection('how-it-works')} 
              className="text-left py-2 hover:text-white transition-colors"
            >
              How it works
            </button>
            <button 
              onClick={() => scrollToSection('security')} 
              className="text-left py-2 hover:text-white transition-colors"
            >
              Security Architecture
            </button>
            <button 
              onClick={() => scrollToSection('specifications')} 
              className="text-left py-2 hover:text-white transition-colors"
            >
              Specifications & Quotas
            </button>
            <button 
              onClick={() => scrollToSection('faq')} 
              className="text-left py-2 hover:text-white transition-colors"
            >
              FAQ
            </button>
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onStartUpload) onStartUpload();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0050FF] to-[#00D6FF] text-white text-xs font-semibold shadow-lg shadow-blue-500/25 active:scale-95"
              >
                Share a file
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
