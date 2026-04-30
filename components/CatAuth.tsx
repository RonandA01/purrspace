"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { PawPrintIcon } from "./PawPrintIcon";

export function CatAuth() {
  const router = useRouter();

  // Redirect to home once authenticated
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_IN") {
          router.push("/");
          router.refresh();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [router]);

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

        {/* Auth UI */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "#FFB7C5",
                    brandAccent: "#ff9db3",
                    brandButtonText: "white",
                    defaultButtonBackground: "#F0F1F3",
                    defaultButtonBackgroundHover: "#E9ECEF",
                    inputBackground: "#F8F9FA",
                    inputBorder: "#E9ECEF",
                    inputBorderFocus: "#FFB7C5",
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
            redirectTo={
              typeof window !== "undefined"
                ? `${window.location.origin}/`
                : "/"
            }
          />
        </div>
      </div>
    </div>
  );
}
