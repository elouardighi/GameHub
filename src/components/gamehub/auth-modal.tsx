"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Loader2, Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AVATAR_COLORS } from "@/lib/constants";

type Tab = "login" | "signup";

interface AuthModalProps {
  onSuccess: () => void;
}

export function AuthModal({ onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<Tab>("login");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPassword2, setSignupPassword2] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await signIn("credentials", {
        email: loginEmail.trim(),
        password: loginPassword,
        redirect: false,
      });
      if (!res || res.error) {
        setError("Invalid email or password.");
        return;
      }
      toast.success("Welcome back to GameHub! 🎮");
      onSuccess();
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (signupPassword !== signupPassword2) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName.trim(),
          email: signupEmail.trim(),
          password: signupPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sign up failed.");
        return;
      }

      // Auto-login
      const loginRes = await signIn("credentials", {
        email: signupEmail.trim(),
        password: signupPassword,
        redirect: false,
      });
      if (!loginRes || loginRes.error) {
        setError("Account created — please log in to continue.");
        setTab("login");
        setLoginEmail(signupEmail.trim());
        return;
      }
      toast.success(`Welcome to GameHub, ${signupName.trim()}! 🎉`);
      onSuccess();
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    setLoginEmail("nova@gamehub.gg");
    setLoginPassword("demo");
    try {
      const res = await signIn("credentials", {
        email: "nova@gamehub.gg",
        password: "demo",
        redirect: false,
      });
      if (!res || res.error) {
        setError("Could not log in as demo user.");
        return;
      }
      toast.success("Logged in as NovaStrike (demo user). 🚀");
      onSuccess();
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#1a1310] flex items-center justify-center p-4 dark">
      {/* Animated background accents */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(88,101,242,0.25), transparent 60%), radial-gradient(ellipse at bottom, rgba(235,69,158,0.15), transparent 60%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-[480px] bg-[#2e2520] rounded-lg shadow-2xl overflow-hidden"
      >
        {/* Header with logo */}
        <div className="px-6 pt-6 pb-3 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#d4a03a] flex items-center justify-center mb-3">
            <Gamepad2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to GameHub</h1>
          <p className="text-sm text-[#d4c4a8] mt-1">
            {tab === "login"
              ? "We're so glad to see you again!"
              : "Join the gaming community today."}
          </p>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <div className="flex gap-1 p-1 bg-[#1a1310] rounded-lg mb-4">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setError(null);
              }}
              className={cn(
                "flex-1 py-2 rounded-md text-sm font-semibold transition-colors",
                tab === "login"
                  ? "bg-[#d4a03a] text-white"
                  : "text-[#d4c4a8] hover:text-white"
              )}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("signup");
                setError(null);
              }}
              className={cn(
                "flex-1 py-2 rounded-md text-sm font-semibold transition-colors",
                tab === "signup"
                  ? "bg-[#d4a03a] text-white"
                  : "text-[#d4c4a8] hover:text-white"
              )}
            >
              Sign Up
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          <AnimatePresence mode="wait">
            {tab === "login" ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                <Field
                  label="Email"
                  type="email"
                  value={loginEmail}
                  onChange={setLoginEmail}
                  placeholder="nova@gamehub.gg"
                  disabled={loading}
                />
                <Field
                  label="Password"
                  type={showLoginPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={setLoginPassword}
                  placeholder="••••••••"
                  disabled={loading}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      className="text-[#6a5a50] hover:text-white"
                      aria-label="Toggle password visibility"
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading || !loginEmail.trim() || !loginPassword}
                  className="w-full h-10 bg-[#d4a03a] hover:bg-[#b08530] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Log In
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                <Field
                  label="Username"
                  value={signupName}
                  onChange={setSignupName}
                  placeholder="CoolGamer2025"
                  disabled={loading}
                />
                <Field
                  label="Email"
                  type="email"
                  value={signupEmail}
                  onChange={setSignupEmail}
                  placeholder="you@gamehub.gg"
                  disabled={loading}
                />
                <Field
                  label="Password"
                  type={showSignupPassword ? "text" : "password"}
                  value={signupPassword}
                  onChange={setSignupPassword}
                  placeholder="At least 6 characters"
                  disabled={loading}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword((v) => !v)}
                      className="text-[#6a5a50] hover:text-white"
                      aria-label="Toggle password visibility"
                    >
                      {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
                <Field
                  label="Confirm Password"
                  type={showSignupPassword ? "text" : "password"}
                  value={signupPassword2}
                  onChange={setSignupPassword2}
                  placeholder="Re-enter password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={handleSignup}
                  disabled={
                    loading ||
                    !signupName.trim() ||
                    !signupEmail.trim() ||
                    !signupPassword ||
                    !signupPassword2
                  }
                  className="w-full h-10 bg-[#8bb04a] hover:bg-[#6b8b3a] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Create Account
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="mt-3 text-sm text-[#b04a4a] bg-[#b04a4a]/10 border border-[#b04a4a]/30 rounded-md p-2.5 text-center">
              {error}
            </div>
          )}

          {/* Demo user shortcut */}
          <div className="mt-5 pt-4 border-t border-[#4a3a30] text-center">
            <p className="text-xs text-[#6a5a50] mb-2">
              Just want to look around?
            </p>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="text-sm text-[#d4a03a] hover:underline disabled:opacity-50"
            >
              Try the demo user (NovaStrike)
            </button>
            <p className="text-[11px] text-[#6a5a50] mt-1.5">
              email <code className="text-[#d4c4a8]">nova@gamehub.gg</code> · password{" "}
              <code className="text-[#d4c4a8]">demo</code>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Avatar color preview chips (decorative side accents) */}
      <div className="hidden md:flex absolute right-10 top-1/2 -translate-y-1/2 gap-1 pointer-events-none opacity-30">
        {AVATAR_COLORS.slice(0, 6).map((c, i) => (
          <motion.div
            key={c}
            initial={{ y: 0 }}
            animate={{ y: [0, -6, 0] }}
            transition={{ delay: i * 0.2, duration: 2.4, repeat: Infinity }}
            className="w-4 h-4 rounded-full"
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="hidden md:flex absolute left-10 top-1/2 -translate-y-1/2 gap-1 pointer-events-none opacity-30">
        {AVATAR_COLORS.slice(6, 10).map((c, i) => (
          <motion.div
            key={c}
            initial={{ y: 0 }}
            animate={{ y: [0, 6, 0] }}
            transition={{ delay: i * 0.3, duration: 2.6, repeat: Infinity }}
            className="w-4 h-4 rounded-full"
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  trailing = null,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs uppercase font-semibold text-[#d4c4a8] mb-1.5 tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full h-10 bg-[#1a1310] text-[#f5e6c8] placeholder:text-[#5a4a40] text-sm rounded-md px-3 outline-none border border-[#1a1310] focus:border-[#d4a03a] disabled:opacity-60"
        />
        {trailing && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {trailing}
          </div>
        )}
      </div>
    </div>
  );
}

// (no trailing exports needed)
