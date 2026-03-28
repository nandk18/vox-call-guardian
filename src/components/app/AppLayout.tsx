import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Inbox, Bot, Settings, Bell } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/app/inbox": "Inbox",
  "/app/agent": "Agent",
  "/app/settings": "Settings",
  "/app/onboarding": "Onboarding",
};

const AppLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const email = user?.email ?? "";
  const initial = email.charAt(0).toUpperCase();
  const pageTitle = pageTitles[location.pathname] ?? "Vox";

  // Fetch agent for trial info
  const { data: agent } = useQuery({
    queryKey: ["agent", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents")
        .select("trial_ends_at, onboarding_complete")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Unread calls count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-calls", user?.id],
    queryFn: async () => {
      // Get agent ids for this user
      const { data: agents } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user!.id);
      if (!agents?.length) return 0;
      const ids = agents.map((a) => a.id);
      const { count } = await supabase
        .from("calls")
        .select("*", { count: "exact", head: true })
        .in("agent_id", ids)
        .eq("is_read", false);
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const trialEndsAt = agent?.trial_ends_at ? new Date(agent.trial_ends_at) : null;
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000))
    : null;
  const showTrialBanner = daysLeft !== null && daysLeft <= 3;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navItems = [
    { to: "/app/inbox", icon: Inbox, label: "Inbox", badge: unreadCount },
    { to: "/app/agent", icon: Bot, label: "Agent" },
    { to: "/app/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col items-center w-[72px] border-r border-border bg-card py-4 fixed h-full z-40">
        {/* Logo */}
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg mb-8">
          V
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col items-center gap-2">
          {navItems.map((item) => (
            <Tooltip key={item.to}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.badge ? (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>

        {/* Bottom */}
        <div className="flex flex-col items-center gap-3 mt-auto">
          {daysLeft !== null && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`text-xs font-bold px-2 py-1 rounded-md ${daysLeft <= 3 ? "bg-orange-500/20 text-orange-400" : "bg-orange-500/10 text-orange-300"}`}>
                  {daysLeft}d
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">Trial: {daysLeft} days left</TooltipContent>
            </Tooltip>
          )}
          <div className="w-9 h-9 rounded-full bg-secondary text-foreground flex items-center justify-center text-sm font-semibold">
            {initial}
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 md:ml-[72px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/80 backdrop-blur-xl sticky top-0 z-30">
          <span className="text-primary font-bold text-lg md:hidden">Vox</span>
          <span className="hidden md:block text-primary font-bold text-lg">Vox</span>
          <span className="font-semibold text-sm absolute left-1/2 -translate-x-1/2">{pageTitle}</span>
          <div className="flex items-center gap-3">
            <button className="relative text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center text-xs font-semibold"
              >
                {initial}
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-10 w-52 bg-card border border-border rounded-xl shadow-xl py-2 z-50">
                  <p className="px-4 py-2 text-xs text-muted-foreground truncate">{email}</p>
                  <hr className="border-border" />
                  <button
                    onClick={() => { navigate("/app/settings"); setDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors"
                  >
                    Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-secondary transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Trial banner */}
        {showTrialBanner && (
          <div className="bg-orange-500 text-white px-4 py-2.5 flex items-center justify-between text-sm">
            <span>⚠️ Your trial ends in {daysLeft} day{daysLeft !== 1 ? "s" : ""} — subscribe to keep your Vox number</span>
            <button className="px-4 py-1.5 bg-white text-orange-600 font-semibold rounded-full text-xs hover:bg-white/90 transition-colors">
              Subscribe Now
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-40">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-1 text-xs transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <div className="relative">
              <item.icon className="w-5 h-5" />
              {item.badge ? (
                <span className="absolute -top-1.5 -right-2.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </div>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AppLayout;
