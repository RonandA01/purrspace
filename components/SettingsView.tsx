"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Moon, Sun, Lock, Globe, Bell, User, SignOut, Warning, Pencil } from "@phosphor-icons/react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { useDarkMode } from "@/hooks/useDarkMode";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Toggle component ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full border-0 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-paw-pink/60",
        checked ? "bg-paw-pink" : "bg-border"
      )}
    >
      <span className={cn(
        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200",
        checked ? "left-[22px]" : "left-0.5"
      )} />
    </button>
  );
}

// ── Settings group ────────────────────────────────────────────────────────────

function SettingsGroup({ title, danger, children }: { title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <div className={cn(
        "px-4 py-3 border-b border-border/60 text-xs font-bold uppercase tracking-wider font-mono",
        danger ? "text-red-500" : "text-muted-foreground"
      )}>
        {title}
      </div>
      {children}
    </section>
  );
}

function SettingsRow({
  label, desc, control, onClick,
}: {
  label: string;
  desc?: string;
  control?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 px-4 py-3.5 border-b border-border/40 last:border-0",
        onClick && "cursor-pointer hover:bg-secondary/50 transition-colors"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>}
      </div>
      {control}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

const NOTIF_KEYS = ["paws", "comments", "follows", "dms", "marketing"] as const;
type NotifKey = typeof NOTIF_KEYS[number];
const NOTIF_LABELS: Record<NotifKey, string> = {
  paws:      "Paws on my purrs",
  comments:  "New purrlies (comments)",
  follows:   "New followers",
  dms:       "Whispurr messages",
  marketing: "Product updates & treats",
};

function loadNotifPrefs(): Record<NotifKey, boolean> {
  try {
    const raw = localStorage.getItem("ps-notif-prefs");
    if (raw) return { paws: true, comments: true, follows: true, dms: true, marketing: false, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { paws: true, comments: true, follows: true, dms: true, marketing: false };
}

export function SettingsView() {
  const { user, profile } = useSession();
  const router = useRouter();
  const { dark, setDark } = useDarkMode();

  const [notifs, setNotifs] = useState<Record<NotifKey, boolean>>(loadNotifPrefs);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);

  useEffect(() => {
    if (profile) setIsPrivate(profile.is_private ?? false);
  }, [profile]);

  const toggleNotif = (key: NotifKey, val: boolean) => {
    const next = { ...notifs, [key]: val };
    setNotifs(next);
    try { localStorage.setItem("ps-notif-prefs", JSON.stringify(next)); } catch { /* ignore */ }
  };

  const togglePrivate = async (val: boolean) => {
    if (!user) return;
    setIsPrivate(val);
    const { error } = await supabase.from("profiles").update({ is_private: val }).eq("id", user.id);
    if (error) {
      setIsPrivate(!val);
      toast.error("Failed to update privacy setting");
    } else {
      toast(val ? "Account set to private 🔒" : "Account set to public 🌐");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold">Settings ⚙️</h1>

      {/* Appearance */}
      <SettingsGroup title="Appearance">
        <SettingsRow
          label="Night-cat mode"
          desc="Easier on tired eyes — yours and your cat's."
          control={<Toggle checked={dark} onChange={setDark} />}
        />
        <SettingsRow
          label={dark ? "Dark mode is on" : "Light mode is on"}
          desc="Changes take effect immediately across all pages."
          control={
            <span className="text-muted-foreground">
              {dark ? <Moon size={18} weight="fill" className="text-paw-pink" /> : <Sun size={18} weight="fill" className="text-paw-pink" />}
            </span>
          }
        />
      </SettingsGroup>

      {/* Notifications */}
      <SettingsGroup title="Notifications">
        {NOTIF_KEYS.map((key) => (
          <SettingsRow
            key={key}
            label={NOTIF_LABELS[key]}
            control={<Toggle checked={notifs[key]} onChange={(v) => toggleNotif(key, v)} />}
          />
        ))}
      </SettingsGroup>

      {/* Privacy */}
      <SettingsGroup title="Privacy">
        <SettingsRow
          label="Private account"
          desc="Only approved followers can see your purrs."
          control={<Toggle checked={isPrivate} onChange={togglePrivate} />}
        />
        <SettingsRow
          label="Account visibility"
          control={
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {isPrivate
                ? <><Lock size={14} className="text-paw-pink" /> Private</>
                : <><Globe size={14} className="text-paw-pink" /> Public</>}
            </span>
          }
        />
      </SettingsGroup>

      {/* Account */}
      <SettingsGroup title="Account">
        <SettingsRow
          label="Edit profile"
          desc="Update your display name, bio, avatar, and cover."
          control={<Pencil size={16} className="text-muted-foreground" />}
          onClick={() => router.push("/profile")}
        />
        <SettingsRow
          label="Saved posts"
          desc="Your pawmarked posts and archive."
          control={<span className="text-xs text-muted-foreground">→</span>}
          onClick={() => router.push("/saved")}
        />
        <SettingsRow
          label="Sign out"
          control={<SignOut size={16} className="text-muted-foreground" />}
          onClick={handleSignOut}
        />
      </SettingsGroup>

      {/* Danger zone */}
      <SettingsGroup title="Danger zone" danger>
        <SettingsRow
          label="Delete account"
          desc="This cannot be undone. All your purrs and data will be permanently removed."
          control={
            <button
              onClick={() => toast.error("Please contact support to delete your account.")}
              className="shrink-0 rounded-full border border-red-200 dark:border-red-800/50 px-3 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              Delete
            </button>
          }
        />
      </SettingsGroup>

      {/* Footer */}
      <p className="text-center text-[11px] text-muted-foreground/60 leading-relaxed pb-2">
        PurrSpace · Made with 🐾 ·{" "}
        <Link href="/terms" className="hover:text-paw-pink transition-colors">Privacy &amp; Terms</Link>
      </p>
    </div>
  );
}
