"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { PawPrintIcon } from "./PawPrintIcon";

type Tab = "signin" | "signup";

const INPUT_CLS =
  "w-full rounded-xl border border-border/60 bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-paw-pink/40 focus:border-paw-pink transition-all";
const LABEL_CLS = "block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide";
const BTN_CLS =
  "w-full rounded-2xl bg-paw-pink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-paw-pink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const GENDERS = ["Prefer not to say", "Female", "Male", "Non-binary", "Other"];

export function CatAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [tab, setTab] = useState<Tab>("signin");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Sign-in fields
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");

  // Sign-up fields
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suFullName, setSuFullName] = useState("");
  const [suUsername, setSuUsername] = useState("");
  const [suBirthday, setSuBirthday] = useState("");
  const [suGender, setSuGender] = useState("Prefer not to say");
  const [suAgreed, setSuAgreed] = useState(false);

  // Reset everything when switching tabs
  const switchTab = (t: Tab) => {
    setTab(t);
    setShowPassword(false);
    setEmailSent(false);
    setSiEmail(""); setSiPassword("");
    setSuEmail(""); setSuPassword(""); setSuFullName("");
    setSuUsername(""); setSuBirthday(""); setSuGender("Prefer not to say");
    setSuAgreed(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.push(next);
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router, next]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: siEmail.trim(),
        password: siPassword,
      });
      if (error) toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suAgreed) { toast.error("Please agree to the Terms & Privacy Policy"); return; }
    if (!suBirthday) { toast.error("Birthday is required"); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: suEmail.trim(),
        password: suPassword,
        options: {
          data: {
            full_name: suFullName.trim(),
            username: suUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
            birthday: suBirthday,
            gender: suGender,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        setEmailSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-paw-pink-light text-paw-pink mb-2">
            <PawPrintIcon size={36} />
          </div>
          <h1 className="text-2xl font-bold">
            Welcome to Purr<span className="text-paw-pink">Space</span>
          </h1>
          <p className="text-sm text-muted-foreground">Your cozy corner of the internet 🐱</p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
          {/* Tab switcher */}
          <div className="flex rounded-2xl bg-secondary/60 p-1 gap-1">
            {(["signin", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${
                  tab === t
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === "signin" ? (
              <motion.form
                key="signin"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.18 }}
                onSubmit={handleSignIn}
                className="space-y-4"
              >
                <div>
                  <label className={LABEL_CLS}>Email</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={siEmail}
                    onChange={(e) => setSiEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={siPassword}
                      onChange={(e) => setSiPassword(e.target.value)}
                      placeholder="••••••••"
                      className={INPUT_CLS + " pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className={BTN_CLS}>
                  {loading ? "Signing in…" : "Sign In 🐾"}
                </button>

                <OAuthButtons onOAuth={handleOAuth} />
              </motion.form>
            ) : emailSent ? (
              <motion.div
                key="email-sent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-3 py-4"
              >
                <span className="text-4xl">📬</span>
                <p className="font-semibold text-foreground">Check your email!</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We sent a confirmation link to <strong>{suEmail}</strong>. Click it to activate your account.
                </p>
                <button
                  onClick={() => switchTab("signin")}
                  className="text-sm text-paw-pink hover:underline mt-2"
                >
                  Back to Sign In
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="signup"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
                onSubmit={handleSignUp}
                className="space-y-3.5"
              >
                {/* Full Name */}
                <div>
                  <label className={LABEL_CLS}>Full Name <span className="text-paw-pink">*</span></label>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={suFullName}
                    onChange={(e) => setSuFullName(e.target.value)}
                    placeholder="Your full name"
                    className={INPUT_CLS}
                  />
                </div>

                {/* Username */}
                <div>
                  <label className={LABEL_CLS}>Username <span className="text-paw-pink">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={suUsername}
                      onChange={(e) => setSuUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                      placeholder="purring_cat"
                      className={INPUT_CLS + " pl-7"}
                      minLength={3}
                      maxLength={30}
                    />
                  </div>
                </div>

                {/* Birthday */}
                <div>
                  <label className={LABEL_CLS}>Birthday <span className="text-paw-pink">*</span></label>
                  <input
                    type="date"
                    required
                    value={suBirthday}
                    onChange={(e) => setSuBirthday(e.target.value)}
                    max={new Date(Date.now() - 13 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                    className={INPUT_CLS}
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className={LABEL_CLS}>Gender <span className="text-paw-pink">*</span></label>
                  <select
                    required
                    value={suGender}
                    onChange={(e) => setSuGender(e.target.value)}
                    className={INPUT_CLS}
                  >
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Email */}
                <div>
                  <label className={LABEL_CLS}>Email <span className="text-paw-pink">*</span></label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={suEmail}
                    onChange={(e) => setSuEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={INPUT_CLS}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className={LABEL_CLS}>Password <span className="text-paw-pink">*</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={suPassword}
                      onChange={(e) => setSuPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className={INPUT_CLS + " pr-10"}
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Terms checkbox */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={suAgreed}
                      onChange={(e) => setSuAgreed(e.target.checked)}
                      className="sr-only"
                    />
                    <motion.div
                      animate={{
                        backgroundColor: suAgreed ? "var(--paw-pink)" : "transparent",
                        borderColor: suAgreed ? "var(--paw-pink)" : "var(--border)",
                      }}
                      className="h-4 w-4 rounded border-2 flex items-center justify-center"
                    >
                      {suAgreed && (
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          viewBox="0 0 12 10"
                          className="h-2.5 w-2.5 stroke-white"
                          fill="none"
                        >
                          <path d="M1 5l3.5 3.5L11 1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </motion.svg>
                      )}
                    </motion.div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                    I agree to the{" "}
                    <Link href="/terms" className="text-paw-pink underline hover:text-paw-pink/80" target="_blank">
                      Terms &amp; Data Privacy Policy
                    </Link>{" "}
                    (Philippines Data Privacy Act of 2012 – R.A. 10173)
                  </p>
                </label>

                <button type="submit" disabled={loading || !suAgreed} className={BTN_CLS}>
                  {loading ? "Creating account…" : "Create Account 🐾"}
                </button>

                <OAuthButtons onOAuth={handleOAuth} />
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function OAuthButtons({ onOAuth }: { onOAuth: (p: "google" | "github") => void }) {
  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-border/60" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="flex-1 h-px bg-border/60" />
      </div>
      <button
        type="button"
        onClick={() => onOAuth("google")}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-secondary/40 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>
      <button
        type="button"
        onClick={() => onOAuth("github")}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-secondary/40 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
        </svg>
        Continue with GitHub
      </button>
    </div>
  );
}
