import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setLoading(false);

        if (event === "SIGNED_IN" && session) {
          setTimeout(() => {
            checkOnboardingStatus(session);
          }, 0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboardingStatus = async (sess: Session) => {
    const path = window.location.pathname;
    if (path === "/login" || path === "/signup") {
      // Will be handled by the page's own redirect logic
    }

    try {
      const { data: existing } = await supabase
        .from("agents")
        .select("id, onboarding_complete")
        .eq("user_id", sess.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!existing) {
        // Only insert if truly no row exists
        await supabase.from("agents").insert({
          user_id: sess.user.id,
          business_name: sess.user.user_metadata?.business_name || "",
          onboarding_complete: false,
          trial_ends_at: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000
          ).toISOString(),
        });
        navigate("/app/onboarding");
      } else if (!existing.onboarding_complete) {
        navigate("/app/onboarding");
      } else {
        const currentPath = window.location.pathname;
        if (currentPath === "/login" || currentPath === "/signup" || currentPath === "/") {
          navigate("/app/inbox");
        }
      }
    } catch (err) {
      console.error("Failed to check onboarding status:", err);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
