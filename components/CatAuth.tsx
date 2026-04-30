"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PawPrintIcon } from "./PawPrintIcon";

export function CatAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_IN") {
          router.push(next);
          router.refresh();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [router, next]);

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}${next}`
      : next;

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
          <p className="text-sm text-muted-foreground">
            Your cozy corner of the internet 🐱
          </p>
        </div>

        {/* Auth UI — gated behind terms agreement */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
          {/* Terms checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only"
              />
              <motion.div
                animate={{
                  backgroundColor: agreed ? "var(--paw-pink)" : "transparent",
                  borderColor: agreed ? "var(--paw-pink)" : "var(--border)",
                }}
                className="h-4 w-4 rounded border-2 flex items-center justify-center"
              >
                {agreed && (
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
              <Link href="/terms" className="text-paw-pink underline hover:text-paw-pink/80">
                Terms &amp; Data Privacy Policy
              </Link>{" "}
              (Philippines Data Privacy Act of 2012 – R.A. 10173)
            </p>
          </label>

          {/* Auth form — blurred/disabled until agreed */}
          <div className="relative">
            <AnimatePresence>
              {!agreed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-card/80 backdrop-blur-[2px]"
                >
                  <span className="text-2xl">🔒</span>
                  <p className="text-xs text-muted-foreground text-center px-4">
                    Please agree to the Terms &amp; Privacy Policy to continue
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={agreed ? "" : "pointer-events-none select-none opacity-40"}>
              <Auth
                supabaseClient={supabase}
                appearance={{
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: "#ffa500",
                        brandAccent: "#e69500",
                        brandButtonText: "white",
                        defaultButtonBackground: "#F0F1F3",
                        defaultButtonBackgroundHover: "#E9ECEF",
                        inputBackground: "#F8F9FA",
                        inputBorder: "#E9ECEF",
                        inputBorderFocus: "#ffa500",
                        inputText: "#2D2D2D",
                      },
                      radii: {
                        buttonBorderRadius: "999px",
                        inputBorderRadius: "14px",
                      },
                      fontSizes: {
                        baseBodySize: "14px",
                      },
                    },
                  },
                  className: {
                    button: "font-semibold tracking-wide",
                    input: "text-sm",
                  },
                }}
                providers={["google", "github"]}
                redirectTo={redirectTo}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
