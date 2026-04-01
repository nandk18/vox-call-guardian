import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Loader2 } from "lucide-react";

const Login = () => {
  usePageTitle();
  const { user } = useAuth();
  const [tab, setTab] = useState<"phone" | "email">("phone");

  // Phone
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [verifying, setVerifying] = useState(false);

  // Email
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user) return <Navigate to="/app/inbox" replace />;

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) { setError("Enter a valid 10-digit number"); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({ phone: `+91${phone}` });
    setLoading(false);
    if (error) setError(error.message);
    else { setOtpSent(true); setCountdown(30); }
  };

  const handleVerifyOtp = async () => {
    const token = otp.join("");
    if (token.length !== 6) return;
    setVerifying(true);
    setError("");
    const { error } = await supabase.auth.verifyOtp({ phone: `+91${phone}`, token, type: "sms" });
    setVerifying(false);
    if (error) setError("Invalid OTP. Try again.");
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Paste support
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((d, i) => { if (index + i < 6) newOtp[index + i] = d; });
      setOtp(newOtp);
      const nextIdx = Math.min(index + digits.length, 5);
      document.getElementById(`otp-${nextIdx}`)?.focus();
      if (newOtp.every((d) => d)) {
        setTimeout(() => handleAutoVerify(newOtp), 100);
      }
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, "");
    setOtp(newOtp);
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
    if (newOtp.every((d) => d)) {
      setTimeout(() => handleAutoVerify(newOtp), 100);
    }
  };

  const handleAutoVerify = async (otpArr: string[]) => {
    const token = otpArr.join("");
    if (token.length !== 6) return;
    setVerifying(true);
    setError("");
    const { error } = await supabase.auth.verifyOtp({ phone: `+91${phone}`, token, type: "sms" });
    setVerifying(false);
    if (error) setError("Invalid OTP. Try again.");
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleResend = async () => {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: `+91${phone}` });
    setLoading(false);
    if (error) setError(error.message);
    else { setCountdown(30); setOtp(["", "", "", "", "", ""]); }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/app/inbox` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setEmailSent(true);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app/inbox` },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-primary">Vox</Link>
        </div>

        <h1 className="text-2xl font-bold text-center mb-1">Welcome back</h1>
        <p className="text-muted-foreground text-center text-sm mb-6">Sign in to your account</p>

        {/* Tabs */}
        <div className="flex bg-secondary rounded-xl p-1 mb-6">
          <button onClick={() => { setTab("phone"); setError(""); }} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "phone" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            Phone
          </button>
          <button onClick={() => { setTab("email"); setError(""); }} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "email" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            Email
          </button>
        </div>

        {tab === "phone" ? (
          !otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground bg-secondary px-3 py-3 rounded-xl border border-input">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  placeholder="Enter mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="flex-1 px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-base"
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <button type="submit" disabled={loading || phone.length !== 10} className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[48px]">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Send OTP"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">Enter the 6-digit code sent to <strong className="text-foreground">+91 {phone}</strong></p>
              <div className="flex justify-center gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className={`w-11 h-12 text-center text-lg font-bold rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      error ? "border-destructive" : "border-border"
                    }`}
                  />
                ))}
              </div>
              {error && <p className="text-destructive text-sm text-center">{error}</p>}
              {verifying && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                </div>
              )}
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-muted-foreground">Resend in {countdown}s</p>
                ) : (
                  <button onClick={handleResend} disabled={loading} className="text-xs text-primary hover:underline">
                    Resend OTP
                  </button>
                )}
              </div>
              <button onClick={() => { setOtpSent(false); setOtp(["", "", "", "", "", ""]); setError(""); }} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
                ← Change number
              </button>
            </div>
          )
        ) : (
          emailSent ? (
            <div className="text-center py-6">
              <p className="text-4xl mb-4">📧</p>
              <h2 className="text-xl font-bold mb-2">Check your email</h2>
              <p className="text-muted-foreground text-sm">We sent a magic link to <strong className="text-foreground">{email}</strong></p>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <input
                type="email"
                required
                placeholder="you@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-base"
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[48px]">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Send Magic Link"}
              </button>
            </form>
          )
        )}

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button onClick={handleGoogle} className="w-full py-3 border border-border rounded-xl font-medium text-sm hover:bg-secondary transition-colors flex items-center justify-center gap-2 min-h-[48px]">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:underline">Start free trial →</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
