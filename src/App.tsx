import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { StorytellingSection } from './components/StorytellingSection';
import { SecuritySection } from './components/SecuritySection';
import { StatsSection } from './components/StatsSection';
import { SupportedTypesSection } from './components/SupportedTypesSection';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { DownloadPage } from './components/DownloadPage';
import { ToastProvider, useToast } from './context/ToastContext';
import { fileService } from './services/fileService';
import type { UploadProgressState, UploadResult } from './types/file';
import { MAX_SESSION_QUOTA_BYTES } from './utils/mime';

const MainContent: React.FC = () => {
  const [downloadToken, setDownloadToken] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadState, setUploadState] = useState<UploadProgressState>({
    step: 'idle',
    progress: 0,
    message: '',
  });

  const [quotaUsedBytes, setQuotaUsedBytes] = useState<number>(0);
  const [quotaMaxBytes, setQuotaMaxBytes] = useState<number>(MAX_SESSION_QUOTA_BYTES);
  const { showToast } = useToast();

  // Route extraction helper: checks /s/:token or query ?token=...
  const updateRouteFromLocation = () => {
    const path = window.location.pathname;

    const sMatch = path.match(/^\/s\/([a-zA-Z0-9_-]+)/);
    if (sMatch && sMatch[1]) {
      setDownloadToken(sMatch[1]);
    } else {
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get('token');
      if (tokenParam) {
        setDownloadToken(tokenParam);
      } else {
        setDownloadToken(null);
      }
    }
  };

  useEffect(() => {
    updateRouteFromLocation();

    const handlePopState = () => {
      updateRouteFromLocation();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch initial quota
  const refreshQuota = async () => {
    try {
      const q = await fileService.getSessionQuota();
      setQuotaUsedBytes(q.usedBytes);
      setQuotaMaxBytes(q.maxBytes);
    } catch {
      // Ignore quota fetch error on start
    }
  };

  useEffect(() => {
    refreshQuota();
  }, []);

  const handleFileSelected = async (file: File, isOneTime: boolean) => {
    setSelectedFile(file);
    setUploadResult(null);

    try {
      const res = await fileService.uploadFile(
        file,
        isOneTime,
        (step, progress, message) => {
          setUploadState({ step, progress, message });
        }
      );

      setUploadResult(res);
      setUploadState({ step: 'success', progress: 100, message: 'Ready' });
      await refreshQuota();
      showToast('Secure link generated successfully', 'success');
    } catch (err: any) {
      setUploadState({
        step: 'idle',
        progress: 0,
        message: '',
        error: err.message,
      });
      showToast(err.message || 'Upload failed', 'error');
    }
  };

  const handleResetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploadState({ step: 'idle', progress: 0, message: '' });
  };

  const handleCancelUpload = () => {
    handleResetUpload();
    showToast('Upload cancelled', 'info');
  };

  const navigateToDownload = (token: string) => {
    window.history.pushState({}, '', `/s/${token}`);
    updateRouteFromLocation();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToHome = () => {
    window.history.pushState({}, '', '/');
    updateRouteFromLocation();
    handleResetUpload();
    refreshQuota();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
  <div className="relative min-h-screen text-white selection:bg-[#00D6FF]/20 selection:text-[#00D6FF]">

    {/* =====================================================
        FIXED GOOGLE FLOW BACKGROUND
        Stays fixed while the page scrolls
    ====================================================== */}
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">

      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source
          src="\public\video\hero-background.mp4.mp4"
          type="video/mp4"
        />
      </video>

      {/* Cinematic dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />

      {/* Subtle blue atmospheric glow */}
      <div className="absolute inset-0 bg-[#00111A]/10" />

    </div>


    {/* =====================================================
        WEBSITE CONTENT
        Everything scrolls above the fixed video
    ====================================================== */}
    <div className="relative z-10 min-h-screen flex flex-col">

      <Navbar onStartUpload={handleResetUpload} />

      <main className="flex-1">

        {downloadToken ? (

          <DownloadPage
            token={downloadToken}
            onGoHome={navigateToHome}
          />

        ) : (

          <>
            <Hero
              uploadState={uploadState}
              uploadResult={uploadResult}
              selectedFile={selectedFile}
              quotaUsedBytes={quotaUsedBytes}
              quotaMaxBytes={quotaMaxBytes}
              onFileSelected={handleFileSelected}
              onReset={handleResetUpload}
              onCancelUpload={handleCancelUpload}
              onNavigateToDownload={navigateToDownload}
            />

            <StorytellingSection />

            <SecuritySection />

            <StatsSection />

            <SupportedTypesSection />

            <FaqSection />
          </>

        )}

      </main>

      <Footer />

    </div>

  </div>
);
};

export function App() {
  return (
    <ToastProvider>
      <MainContent />
    </ToastProvider>
  );
}

export default App;
