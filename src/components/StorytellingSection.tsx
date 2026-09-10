import React, { useState, useEffect, useRef } from 'react';
import { Upload, Key, Share2, Flame, Check } from 'lucide-react';

export const StorytellingSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subtle particle dissolve animation for Stage 4: "Then it's gone"
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
    }> = [];

    const width = (canvas.width = 300);
    const height = (canvas.height = 200);

    // Seed particles around a central rectangle
    for (let i = 0; i < 65; i++) {
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 120,
        y: height / 2 + (Math.random() - 0.5) * 70,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -Math.random() * 1.2 - 0.2, // Drift upwards like vapor
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.8 + 0.2,
        color: Math.random() > 0.5 ? '#00D6FF' : '#0050FF',
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.005;

        if (p.alpha <= 0) {
          p.x = width / 2 + (Math.random() - 0.5) * 120;
          p.y = height / 2 + (Math.random() - 0.5) * 70;
          p.alpha = Math.random() * 0.7 + 0.3;
          p.vy = -Math.random() * 1.2 - 0.2;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeStep]);

  const steps = [
    {
      id: 'upload',
      number: '01',
      tag: 'UPLOAD',
      title: 'Drop it here.',
      copy: 'Upload the file you need to share. No account. No complicated setup. Instant drag and drop with automatic quota verification.',
      icon: Upload,
      renderVisual: () => (
        <div className="relative w-full h-64 rounded-2xl bg-[#0E0E12] border border-white/10 p-6 flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
          <div className="w-16 h-20 rounded-xl bg-white/[0.04] border border-white/15 flex flex-col items-center justify-center shadow-2xl relative animate-pulse-subtle">
            <div className="w-8 h-1 bg-white/20 rounded-full mb-2" />
            <div className="w-10 h-1 bg-white/20 rounded-full mb-2" />
            <div className="w-6 h-1 bg-white/20 rounded-full" />
            <span className="absolute bottom-2 text-[9px] font-mono text-[#00D6FF]">.PDF</span>
          </div>
          <span className="text-xs text-white/50 mt-4 font-mono">drag_and_drop(file)</span>
        </div>
      ),
    },
    {
      id: 'secure',
      number: '02',
      tag: 'SECURE',
      title: 'A private link, not a permanent address.',
      copy: 'Your file is stored separately from the public interface in private Cloudflare R2 storage and accessed strictly through a unique temporary 256-bit token.',
      icon: Key,
      renderVisual: () => (
        <div className="relative w-full h-64 rounded-2xl bg-[#0E0E12] border border-white/10 p-6 flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#00D6FF]/5 to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#050505] border border-[#00D6FF]/30 shadow-lg shadow-[#00D6FF]/10">
            <Key className="w-5 h-5 text-[#00D6FF]" />
            <span className="font-mono text-xs text-white tracking-wider">
              /s/7fK9xP2mQ8vL...
            </span>
          </div>
          <div className="flex items-center gap-2 mt-4 text-[11px] font-mono text-emerald-400">
            <Check className="w-3.5 h-3.5" />
            <span>SHA-256 Hashed in Database</span>
          </div>
        </div>
      ),
    },
    {
      id: 'share',
      number: '03',
      tag: 'SHARE',
      title: 'One link. Anywhere.',
      copy: 'Copy the link and send it through WhatsApp, email, Slack, Discord, or anywhere else. The recipient downloads directly through an unbranded, distraction-free screen.',
      icon: Share2,
      renderVisual: () => (
        <div className="relative w-full h-64 rounded-2xl bg-[#0E0E12] border border-white/10 p-6 flex flex-col items-center justify-center overflow-hidden">
          <div className="relative flex items-center justify-center">
            {/* Center node */}
            <div className="w-12 h-12 rounded-full bg-[#0050FF] text-white flex items-center justify-center z-10 shadow-lg shadow-blue-500/30">
              <Share2 className="w-5 h-5" />
            </div>

            {/* Orbiting destination nodes */}
            <div className="absolute w-44 h-44 rounded-full border border-dashed border-white/10 animate-spin" style={{ animationDuration: '20s' }} />
            <div className="absolute -top-6 -left-6 px-2.5 py-1 rounded-full bg-white/10 text-[10px] font-mono text-white/80">
              WhatsApp
            </div>
            <div className="absolute -bottom-6 -right-6 px-2.5 py-1 rounded-full bg-white/10 text-[10px] font-mono text-white/80">
              Slack / Teams
            </div>
            <div className="absolute -bottom-6 -left-6 px-2.5 py-1 rounded-full bg-white/10 text-[10px] font-mono text-white/80">
              Direct Link
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'disappear',
      number: '04',
      tag: 'DISAPPEAR',
      title: "Then it's gone.",
      copy: 'Temporary files automatically become unavailable after their expiration period or immediately after their 1st download. Data is expunged from storage vaults with zero recovery trace.',
      icon: Flame,
      renderVisual: () => (
        <div className="relative w-full h-64 rounded-2xl bg-[#0E0E12] border border-white/10 p-6 flex flex-col items-center justify-center overflow-hidden">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
          <div className="relative z-10 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 font-mono text-xs mb-2">
              <Flame className="w-3.5 h-3.5 text-red-400" />
              Object Shredded
            </span>
            <p className="text-xs text-white/40 font-mono">status: "deleted"</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 max-w-6xl mx-auto relative">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs font-mono text-[#00D6FF] tracking-widest uppercase font-semibold">
          LIFECYCLE ARCHITECTURE
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2 mb-4">
          How DROPONCE Works
        </h2>
        <p className="text-sm sm:text-base text-white/60">
          Engineered for minimal surface area and ephemeral privacy.
        </p>
      </div>

      {/* Interactive 4-step Storytelling Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Step Selector / Narrative */}
        <div className="flex flex-col gap-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = activeStep === idx;

            return (
              <div
                key={step.id}
                onClick={() => setActiveStep(idx)}
                className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 border text-left ${
                  isSelected
                    ? 'bg-[#0E0E12] border-white/20 shadow-xl'
                    : 'bg-[#050505] border-white/5 hover:border-white/10 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-semibold tracking-wider text-[#00D6FF]">
                    {step.number} • {step.tag}
                  </span>
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-white/40'}`} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1.5 tracking-tight">{step.title}</h3>
                <p className="text-xs text-white/60 leading-relaxed">{step.copy}</p>
              </div>
            );
          })}
        </div>

        {/* Visual Showcase Panel */}
        <div className="sticky top-28 hardware-accel">
          <div className="p-2 rounded-3xl bg-gradient-to-b from-white/10 to-transparent border border-white/10 shadow-2xl">
            {steps[activeStep].renderVisual()}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-white/40 px-2 font-mono">
            <span>STAGE {steps[activeStep].number} OF 04</span>
            <span className="text-emerald-400">● REAL-TIME LIFECYCLE</span>
          </div>
        </div>
      </div>
    </section>
  );
};
