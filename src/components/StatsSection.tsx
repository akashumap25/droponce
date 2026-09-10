import React from 'react';

export const StatsSection: React.FC = () => {
  const stats = [
    {
      value: '100 MB',
      label: 'Maximum file size',
      subtext: 'High-speed encrypted transfer',
    },
    {
      value: '24 HOURS',
      label: 'Maximum lifetime',
      subtext: 'Automated expiration purge',
    },
    {
      value: '1 LINK',
      label: 'Simple sharing',
      subtext: '256-bit unguessable token',
    },
    {
      value: '0 ACCOUNTS',
      label: 'Required to start',
      subtext: 'Anonymous & immediate',
    },
  ];

  return (
    <section id="specifications" className="py-24 px-6 max-w-6xl mx-auto border-t border-white/[0.08]">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs font-mono text-[#00D6FF] tracking-widest uppercase font-semibold">
          SYSTEM PARAMETERS
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
          Strict limits. Absolute focus.
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="p-6 sm:p-8 rounded-2xl bg-[#08080A] border border-white/10 flex flex-col justify-center text-center relative overflow-hidden group hover:border-white/20 transition-colors"
          >
            <div className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white via-white/95 to-white/70">
              {stat.value}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-white/80 mb-1">
              {stat.label}
            </div>
            <div className="text-[11px] text-white/40 font-mono">
              {stat.subtext}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
