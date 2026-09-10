import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Smartphone, Copy, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface QrCodeModalProps {
  url: string;
  filename: string;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ url, filename, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const { showToast } = useToast();

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: {
        dark: '#050505',
        light: '#FFFFFF',
      },
    })
      .then((dataUri) => setQrDataUrl(dataUri))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [url]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast('Secure link copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy link', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-md p-6 bg-[#0E0E12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
      >
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#00D6FF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#00D6FF]" />
            <h3 id="qr-modal-title" className="text-base font-semibold text-white">Scan to Open</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-white/60 mb-6 truncate">
          File: <span className="text-white font-medium">{filename}</span>
        </p>

        {/* QR Code Container */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-white rounded-xl shadow-inner">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code for secure download link" className="w-56 h-56 rounded-lg" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-black/50 text-xs">
                Generating QR...
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-white/50 mb-6">
          Point your phone camera at this code to access this temporary link directly on your mobile device.
        </p>

        {/* Link bar with copy */}
        <div className="flex items-center gap-2 p-2 bg-[#050505] rounded-xl border border-white/10">
          <input
            type="text"
            readOnly
            value={url}
            className="w-full bg-transparent px-2 text-xs font-mono text-white/80 focus:outline-none"
          />
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white transition-colors shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-white/70" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
