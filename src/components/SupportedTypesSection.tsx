import React from 'react';
import { Image, FileText, FileSpreadsheet, Presentation, Archive, Code, FileCode2, Files } from 'lucide-react';

export const SupportedTypesSection: React.FC = () => {
  const formats = [
    { icon: Image, label: 'Images', exts: 'PNG, JPG, SVG, WebP, GIF' },
    { icon: FileText, label: 'PDF Documents', exts: 'PDF, Adobe Portable Doc' },
    { icon: Files, label: 'Office Docs', exts: 'DOC, DOCX, ODT, RTF' },
    { icon: FileSpreadsheet, label: 'Spreadsheets', exts: 'XLS, XLSX, CSV, ODS' },
    { icon: Presentation, label: 'Presentations', exts: 'PPT, PPTX, Keynote' },
    { icon: Archive, label: 'Archives', exts: 'ZIP, TAR, GZ, 7Z' },
    { icon: Code, label: 'Code & Scripts', exts: 'JSON, JS, TS, PY, HTML' },
    { icon: FileCode2, label: 'Plain Text', exts: 'TXT, Markdown, Logs' },
  ];

  return (
    <section className="py-20 px-6 max-w-6xl mx-auto border-t border-white/[0.08]">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="text-xs font-mono text-[#00D6FF] tracking-widest uppercase font-semibold">
          FORMAT AGNOSTIC
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2 mb-3">
          Share any file. Anywhere.
        </h2>
        <p className="text-sm text-white/50">
          DROPONCE handles raw binary streams up to 50 MB with zero conversion overhead.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {formats.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={i}
              className="p-5 rounded-2xl bg-[#08080A] border border-white/5 hover:border-white/15 transition-all duration-200 flex flex-col items-center text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/70 group-hover:text-white group-hover:scale-105 transition-all mb-3">
                <Icon className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">{f.label}</h4>
              <p className="text-[11px] font-mono text-white/40">{f.exts}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
