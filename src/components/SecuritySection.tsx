import React from 'react';
import { KeyRound, Clock, Trash2, ShieldOff, Server, Database } from 'lucide-react';

export const SecuritySection: React.FC = () => {
  const principles = [
    {
      icon: KeyRound,
      title: 'Cryptographic Access Tokens',
      desc: 'Links use high-entropy 256-bit unguessable random tokens. The database only stores irreversible SHA-256 hashes, protecting links even against database snapshot leaks.',
    },
    {
      icon: Clock,
      title: 'Time-Bounded Ephemeral Storage',
      desc: 'Every file is given an unchangeable 24-hour expiration window. Once the countdown expires, access is denied at the server layer regardless of client display.',
    },
    {
      icon: Trash2,
      title: 'Atomic One-Time Invalidation',
      desc: 'Single-use downloads are authorized atomically via PostgreSQL, preventing concurrent access. The Supabase Storage object is purged after its short signed URL expires.',
    },
    {
      icon: ShieldOff,
      title: 'Private Isolated Bucket',
      desc: 'Supabase Storage is private and never exposed for direct public access. Downloads occur only through backend-authorized signed URLs.',
    },
    {
      icon: Server,
      title: 'Server-Authoritative Decisions',
      desc: 'The browser client is never trusted for authorization, expiration status, or quota calculation. All security and access gates are enforced server-side.',
    },
    {
      icon: Database,
      title: 'Zero Permanent Footprint',
      desc: 'No account requirements, no tracking pixels, and no analytics fingerprinting. Only the bare metadata necessary to deliver the file is retained temporarily.',
    },
  ];

  return (
    <section id="security" className="py-24 px-6 max-w-6xl mx-auto border-t border-white/[0.08]">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs font-mono text-[#00D6FF] tracking-widest uppercase font-semibold">
          SECURITY GUARANTEE
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2 mb-4">
          Private by design.
        </h2>
        <p className="text-sm sm:text-base text-white/60">
          We built DROPONCE on foundational security principles, not marketing hype.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {principles.map((p, index) => {
          const Icon = p.icon;
          return (
            <div
              key={index}
              className="p-6 rounded-2xl bg-[#0A0A0C] border border-white/10 hover:border-white/20 transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#00D6FF] group-hover:scale-110 group-hover:border-[#00D6FF]/30 transition-all mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2 tracking-tight">
                  {p.title}
                </h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  {p.desc}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[10px] font-mono text-white/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>SERVER-VERIFIED</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
