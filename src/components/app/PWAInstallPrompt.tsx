import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("pwa-dismissed") === "true") {
      setDismissed(true);
      return;
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((navigator as any).standalone === true) return;

    // Chrome/Android
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS detection
    const ua = navigator.userAgent;
    if (/iPhone|iPad/.test(ua) && !(navigator as any).standalone) {
      setShowIOSPrompt(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      // installed
    }
    handleDismiss();
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pwa-dismissed", "true");
    setDeferredPrompt(null);
    setShowIOSPrompt(false);
  };

  if (dismissed) return null;
  if (!deferredPrompt && !showIOSPrompt) return null;

  return (
    <div
      className="fixed left-0 right-0 z-40 animate-in slide-in-from-bottom duration-300"
      style={{ bottom: "60px", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="bg-card border-t border-primary/30 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
          V
        </div>
        <div className="flex-1 min-w-0">
          {showIOSPrompt ? (
            <>
              <p className="text-sm font-semibold text-foreground">Install Vox on iPhone</p>
              <p className="text-xs text-muted-foreground">Tap <span className="inline-block">⬆️</span> Share then "Add to Home Screen"</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">Install Vox</p>
              <p className="text-xs text-muted-foreground">Add to home screen for quick access</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Not now
          </button>
          {deferredPrompt && (
            <button
              onClick={handleInstall}
              className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full hover:bg-primary/90 transition-colors"
            >
              Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
