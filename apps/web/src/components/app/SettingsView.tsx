"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import {
  Bell,
  Camera,
  Globe,
  Lock,
  Palette,
  Shield,
  UserRound,
} from "lucide-react";
import { user } from "@/lib/app-data";
import { cn } from "@/lib/cn";

const tabs = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "account", label: "Account", icon: Globe },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
] as const;

type Tab = (typeof tabs)[number]["id"];

export default function SettingsView() {
  const [tab, setTab] = useState<Tab>("profile");
  const [form, setForm] = useState({
    name: user.name,
    username: user.username,
    bio: user.bio,
    website: user.website,
    email: user.email,
  });
  const [saved, setSaved] = useState(false);
  const [toggles, setToggles] = useState({
    quests: true,
    streak: true,
    community: false,
    marketing: false,
    compact: false,
    motion: true,
    twofa: false,
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted">
        Manage your profile, account preferences, and platform security.
      </p>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-white/10">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm",
                active
                  ? "border-b-2 border-pink text-pink"
                  : "text-muted hover:text-text",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "profile" && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold">Public Profile</h2>
          <p className="text-sm text-muted">
            This information will be displayed on your community profile and leaderboard.
          </p>

          <div className="app-panel mt-5 p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 overflow-hidden rounded-full">
                <Image src={user.avatar} alt={`${user.name} profile`} fill className="object-cover" sizes="96px" />
                <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-pink text-bg">
                  <Camera className="h-3.5 w-3.5" />
                </span>
              </div>
              <div>
                <div className="font-semibold">Profile Picture</div>
                <p className="mt-1 max-w-md text-xs text-muted">
                  We support PNG, JPG or GIF. Max size of 800K. This will be visible to everyone
                  on the platform.
                </p>
                <div className="mt-3 flex gap-4 text-sm">
                  <button type="button" className="font-semibold text-pink">
                    Upload New
                  </button>
                  <button type="button" className="text-pink/80">
                    Remove
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <Field label="Display Name">
                <input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="app-input h-11 w-full rounded-lg px-3 text-sm"
                />
              </Field>
              <Field label="Username">
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-lg border border-r-0 border-white/10 bg-white/5 px-3 text-sm text-muted">
                    @
                  </span>
                  <input
                    value={form.username}
                    onChange={(e) => update("username", e.target.value)}
                    className="app-input h-11 w-full rounded-r-lg px-3 text-sm"
                  />
                </div>
              </Field>
            </div>
            <Field label="Short Bio" className="mt-5">
              <textarea
                value={form.bio}
                onChange={(e) => update("bio", e.target.value)}
                rows={3}
                className="app-input w-full rounded-lg px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Website or Portfolio" className="mt-5">
              <input
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                className="app-input h-11 w-full rounded-lg px-3 text-sm"
              />
            </Field>
          </div>
        </section>
      )}

      {tab === "account" && (
        <section className="app-panel mt-8 space-y-5 p-6">
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="app-input h-11 w-full rounded-lg px-3 text-sm"
            />
          </Field>
          <Field label="Language">
            <select className="app-input h-11 w-full rounded-lg px-3 text-sm">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </Field>
          <Field label="Timezone">
            <select className="app-input h-11 w-full rounded-lg px-3 text-sm">
              <option>UTC-05:00 Eastern Time</option>
              <option>UTC+00:00 London</option>
              <option>UTC+05:30 India</option>
            </select>
          </Field>
        </section>
      )}

      {tab === "appearance" && (
        <section className="app-panel mt-8 space-y-4 p-6">
          <Toggle
            label="Compact density"
            description="Reduce padding in dashboards and tables."
            checked={toggles.compact}
            onChange={() => setToggles((t) => ({ ...t, compact: !t.compact }))}
          />
          <Toggle
            label="Motion accents"
            description="Keep neon hover and progress animations."
            checked={toggles.motion}
            onChange={() => setToggles((t) => ({ ...t, motion: !t.motion }))}
          />
          <p className="text-sm text-muted">
            Questoriaa currently ships a single dark cockpit theme to preserve contrast and focus.
          </p>
        </section>
      )}

      {tab === "notifications" && (
        <section className="app-panel mt-8 space-y-4 p-6">
          <Toggle
            label="Quest reminders"
            description="Daily ritual pings and weekly campaign resets."
            checked={toggles.quests}
            onChange={() => setToggles((t) => ({ ...t, quests: !t.quests }))}
          />
          <Toggle
            label="Streak protection"
            description="Warn me before my 12-day streak expires."
            checked={toggles.streak}
            onChange={() => setToggles((t) => ({ ...t, streak: !t.streak }))}
          />
          <Toggle
            label="Community replies"
            description="Mentions, mentor answers, and leaderboard jumps."
            checked={toggles.community}
            onChange={() => setToggles((t) => ({ ...t, community: !t.community }))}
          />
          <Toggle
            label="Product updates"
            description="Occasional research digest and lab launches."
            checked={toggles.marketing}
            onChange={() => setToggles((t) => ({ ...t, marketing: !t.marketing }))}
          />
        </section>
      )}

      {tab === "security" && (
        <section className="app-panel mt-8 space-y-5 p-6">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Lock className="h-4 w-4" /> Password last rotated 46 days ago.
          </div>
          <Field label="New password">
            <input
              type="password"
              placeholder="••••••••"
              className="app-input h-11 w-full rounded-lg px-3 text-sm"
            />
          </Field>
          <Toggle
            label="Two-factor authentication"
            description="Require a one-time code at sign-in."
            checked={toggles.twofa}
            onChange={() => setToggles((t) => ({ ...t, twofa: !t.twofa }))}
          />
          <button type="button" className="btn-ghost rounded-lg px-4 py-2 text-sm">
            Sign out of other sessions
          </button>
        </section>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() =>
            setForm({
              name: user.name,
              username: user.username,
              bio: user.bio,
              website: user.website,
              email: user.email,
            })
          }
          className="px-4 py-2 text-sm text-muted hover:text-text"
        >
          Discard Changes
        </button>
        <button
          type="button"
          onClick={() => setSaved(true)}
          className="btn-pink rounded-lg px-5 py-2.5 text-sm font-semibold"
        >
          {saved ? "Saved" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-sm">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/5 bg-bg px-4 py-3 text-left"
      aria-pressed={checked}
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="text-xs text-muted">{description}</span>
      </span>
      <span
        className={cn(
          "relative h-6 w-11 rounded-full",
          checked ? "bg-pink" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
