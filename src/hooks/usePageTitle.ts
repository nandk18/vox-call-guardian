import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const titles: Record<string, string> = {
  "/": "Vox — AI Phone Receptionist for India",
  "/login": "Sign in — Vox",
  "/signup": "Start Free Trial — Vox",
  "/app/inbox": "Inbox — Vox",
  "/app/agent": "Your Agent — Vox",
  "/app/settings": "Settings — Vox",
  "/app/onboarding": "Setup — Vox",
};

export const usePageTitle = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = titles[pathname] || "Vox";
  }, [pathname]);
};
