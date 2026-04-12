import { useState, useEffect } from "react";
import { X, Share, Plus } from "lucide-react";

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

    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((navigator as any).standalone === true) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

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
      className="fixed left-0 right-0 bottom-0 z-[999] animate-in slide-in-from-bottom duration-300"
    >
      <div
        className="relative border-t-2 border-primary"
        style={{
          background: "#161a23",
          borderRadius: "20px 20px 0 0",
          padding: "20px 24px",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
        }}
      >
        {/* Dismiss X */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo + Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
            V
          </div>
          <div>
            <p className="text-base font-bold text-foreground">Install Vox</p>
            <p className="text-[13px] text-muted-foreground">
              Add to your home screen for the best experience
            </p>
          </div>
        </div>

        {showIOSPrompt ? (
          /* iOS instructions */
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-2 bg-secondary/60 rounded-full px-4 py-2">
              <Share className="w-4 h-4 text-muted-foreground" />
              <span className="text-[13px] text-muted-foreground">Tap Share</span>
            </div>
            <span className="text-muted-foreground text-xs">→</span>
            <div className="flex items-center gap-2 bg-secondary/60 rounded-full px-4 py-2">
              <Plus className="w-4 h-4 text-muted-foreground" />
              <span className="text-[13px] text-muted-foreground">Add to Home Screen</span>
            </div>
          </div>
        ) : (
          /* Android/Chrome install button */
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleInstall}
              className="flex-1 py-3 bg-primary text-primary-foreground font-semibold rounded-full text-sm hover:bg-primary/90 transition-colors"
            >
              Add to Home Screen
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
