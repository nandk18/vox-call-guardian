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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setLoading(false);

        // On sign in, check onboarding status (fire and forget)
        if (event === "SIGNED_IN" && session) {
          // Use setTimeout to avoid blocking the auth callback
          setTimeout(() => {
            checkOnboardingStatus(session);
          }, 0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboardingStatus = async (sess: Session) => {
    // Don't redirect if already on auth pages or onboarding
    const path = window.location.pathname;
    if (path === "/login" || path === "/signup") {
      // Will be handled by the page's own redirect logic
    }

    try {
      const { data: agent } = await supabase
        .from("agents")
        .select("id, onboarding_complete")
        .eq("user_id", sess.user.id)
        .maybeSingle();

      if (!agent) {
        // Create agent row for new user
        await supabase.from("agents").insert({
          user_id: sess.user.id,
          business_name: sess.user.user_metadata?.business_name || "",
          onboarding_complete: false,
        });
        navigate("/app/onboarding");
      } else if (!agent.onboarding_complete) {
        navigate("/app/onboarding");
      } else {
        // Only redirect to inbox if on login/signup pages
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
