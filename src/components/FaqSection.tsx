import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      q: 'What happens when a link expires or is consumed?',
      a: 'The file is completely removed from our private Cloudflare R2 object storage, and its database record is marked as expired or deleted. Any subsequent attempts to access the URL will return an unrecoverable "Link Expired" response.',
    },
    {
      q: 'How does the single-use ("self-destruct") download work?',
      a: 'When enabled, the file can be downloaded exactly once. The moment the recipient initiates and successfully receives the download stream, an atomic database transaction consumes the token and immediately dispatches a deletion request to the storage bucket.',
    },
    {
      q: 'Can anyone search, index, or guess my link?',
      a: 'No. Links use 256-bit cryptographically secure random tokens generated via CSPRNG. There are over 10^77 possible combinations, making brute-force discovery statistically impossible. Our storage bucket is private with search engine indexing explicitly blocked via robots.txt and noindex headers.',
    },
    {
      q: 'Why is there a 100 MB limit per session?',
      a: 'DROPONCE is optimized for quick, ultra-secure handoffs—such as contracts, confidential code archives, credentials, presentations, and sensitive documents—without requiring user accounts. The 100 MB session allowance ensures peak upload speeds and prevents automated denial-of-service abuse.',
    },
    {
      q: 'Do you require an account or collect personal information?',
      a: 'No accounts are ever required. We do not track user identities, build marketing profiles, or require email verification. Privacy is the default architecture.',
    },
  ];

  return (
    <section id="faq" className="py-24 px-6 max-w-4xl mx-auto border-t border-white/[0.08]">
      <div className="text-center mb-16">
        <span className="text-xs font-mono text-[#00D6FF] tracking-widest uppercase font-semibold">
          CLARITY
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2 mb-3">
          Frequently Asked Questions
        </h2>
        <p className="text-sm text-white/50">
          Everything you need to know about the ephemeral architecture.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-white/10 bg-[#0A0A0C] overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                aria-expanded={isOpen}
              >
                <span className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-white/50 transition-transform duration-200 shrink-0 ${
                    isOpen ? 'rotate-180 text-[#00D6FF]' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-white/60 leading-relaxed border-t border-white/5 pt-3 animate-fade-in">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
