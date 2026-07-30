// =============================================================================
// AuthBrandPanel — Redesigned brand & value marketing panel
// =============================================================================
//
// Matches reference design pixel-for-pixel:
// - Deep navy background with faint educational doodles & radial glows
// - Brand logo + "E DEVISER" wordmark
// - "Outcome-Based • Habit-Driven • Future-Ready" badge
// - Headline with gradient "Outcomes" accent
// - Side-by-side Dual Engine cards (OBE Engine & Habit Engine) connected by an infinity badge
// - 3D Foxi mascot with learning path graphic & milestones
// - "Your Learning Journey" card with Level 7 XP progress bar
// - "Trusted & Secure" card (FERPA-aligned, Privacy-first, Enterprise security)
// - Social proof bar (avatars, 4.9/5 stars, 1,200+ institutions)
// =============================================================================

import { useTranslation } from "react-i18next";
import {
  GraduationCap,
  Target,
  Infinity as InfinityIcon,
  ShieldCheck,
  Lock,
  Star,
  Flag,
  TrendingUp,
} from "lucide-react";
import foxiSmiling from "@/design-system/mascot/assets/characters/foxi/foxi-smiling.png";

const AuthBrandPanel = () => {
  const { t } = useTranslation("auth");

  return (
    <div className="auth-brand-panel relative flex flex-col justify-between overflow-hidden bg-[#030f26] px-8 py-8 text-white min-h-full lg:px-12 lg:py-10">
      {/* Faint educational doodle background texture */}
      <div
        className="pointer-events-none absolute inset-0 bg-repeat opacity-[0.06] mix-blend-screen"
        style={{
          backgroundImage: "url('/doodle-background.jpg')",
          backgroundSize: "400px 400px",
          filter: "brightness(1.5) contrast(1.2)",
        }}
      />

      {/* Radial ambient lighting glow 1 (Behind mascot) */}
      <div
        className="pointer-events-none absolute end-4 top-16 h-80 w-80 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(56,189,248,0.4) 0%, rgba(20,184,166,0.2) 60%, transparent 80%)",
        }}
      />
      {/* Radial ambient lighting glow 2 (Bottom left) */}
      <div
        className="pointer-events-none absolute -start-10 bottom-20 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(14,165,233,0.3) 0%, rgba(99,102,241,0.2) 70%, transparent 90%)",
        }}
      />

      {/* MAIN TOP & CENTER CONTENT */}
      <div className="relative z-10 flex flex-col gap-6">
        {/* BRAND HEADER: Logo Mark + E DEVISER Wordmark */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 via-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(20,184,166,0.5)]">
            <img
              src="/edeviser-logo-final.png"
              alt="E Deviser Logo"
              className="h-7 w-auto object-contain brightness-200"
            />
          </div>
          <span className="text-xl font-black tracking-wider text-white">
            E DEVISER
          </span>
        </div>

        {/* PRODUCT POSITIONING BADGE */}
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-teal-400/30 bg-teal-500/10 px-3.5 py-1 text-xs font-bold text-teal-300 backdrop-blur-md shadow-sm">
          <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
          {t("brand.badge", "Outcome-Based • Habit-Driven • Future-Ready")}
        </div>

        {/* HEADLINE & SUBTITLE WITH MASCOT GRID */}
        <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left Text Column */}
          <div className="lg:col-span-8 space-y-3">
            <h1 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-4xl">
              Learning that adapts.
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(45,212,191,0.4)]">
                Outcomes
              </span>{" "}
              that last.
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-slate-300/90 font-medium">
              {t(
                "brand.subtitle",
                "E Deviser combines a powerful Outcome-Based Education (OBE) engine with a Habit Formation engine to drive mastery, build consistency, and create measurable impact."
              )}
            </p>
          </div>

          {/* Right Mascot Column (Visible on lg screens) */}
          <div className="hidden lg:col-span-4 lg:flex relative items-end justify-center">
            {/* Milestones / Learning Journey Path behind mascot */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 200 160" fill="none">
                {/* Curved Hill Surface */}
                <path
                  d="M0 160 Q 100 100 200 140"
                  fill="none"
                  stroke="rgba(30, 58, 138, 0.4)"
                  strokeWidth="60"
                />
                {/* Dotted path */}
                <path
                  d="M20 130 Q 90 90 170 30"
                  stroke="url(#pathGradient)"
                  strokeWidth="3"
                  strokeDasharray="5 5"
                />
                <defs>
                  <linearGradient id="pathGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#2dd4bf" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Path Node 1 */}
              <div className="absolute left-[30%] bottom-[35%] flex h-6 w-6 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-950/80 text-cyan-300 shadow-[0_0_10px_rgba(56,189,248,0.5)]">
                <Target className="h-3 w-3" />
              </div>
              {/* Path Node 2 */}
              <div className="absolute left-[60%] bottom-[55%] flex h-6 w-6 items-center justify-center rounded-full border border-blue-400/50 bg-blue-950/80 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                <TrendingUp className="h-3 w-3" />
              </div>
              {/* Path Node 3 (Star) */}
              <div className="absolute left-[80%] bottom-[75%] flex h-6 w-6 items-center justify-center rounded-full border border-amber-400/50 bg-amber-950/80 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                <Star className="h-3 w-3 fill-amber-300" />
              </div>
              {/* Flag at peak */}
              <div className="absolute right-[5%] top-[10%] text-teal-300">
                <Flag className="h-5 w-5 fill-teal-400" />
              </div>
            </div>

            {/* Foxi 3D Mascot Robot */}
            <div className="relative z-10 hover:scale-105 transition-transform duration-300 drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)]">
              <img
                src={foxiSmiling}
                alt="E Deviser Foxi Mascot"
                className="h-44 w-auto object-contain"
              />
            </div>
          </div>
        </div>

        {/* DUAL ENGINE ARCHITECTURE CARDS */}
        <div className="relative mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* OBE Engine Card */}
          <div className="relative rounded-2xl border border-teal-500/25 bg-[#091b3a]/90 p-4 shadow-xl backdrop-blur-md transition-all hover:border-teal-400/40 hover:bg-[#0c234a]/90">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-teal-400/30 bg-teal-500/20 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.3)]">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">OBE Engine</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-300/80">
              Align CLOs, track mastery, and measure what truly matters.
            </p>
          </div>

          {/* Infinity Visual Connector Badge */}
          <div className="absolute left-1/2 top-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 sm:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/40 bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-[0_0_18px_rgba(20,184,166,0.6)]">
              <InfinityIcon className="h-5 w-5" />
            </div>
          </div>

          {/* Habit Engine Card */}
          <div className="relative rounded-2xl border border-blue-500/25 bg-[#081838]/90 p-4 shadow-xl backdrop-blur-md transition-all hover:border-blue-400/40 hover:bg-[#0a2048]/90">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/20 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <Target className="h-5 w-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">
              Habit Engine
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-300/80">
              Build &amp; sustain habits, earn XP, and achieve streaks.
            </p>
          </div>
        </div>

        {/* YOUR LEARNING JOURNEY PROGRESS CARD */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">Your Learning Journey</span>
            <span className="text-cyan-300">
              <span className="text-white font-extrabold">XP 2,450</span> /
              3,000
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/15 px-2.5 py-1 text-xs font-black text-amber-300 shadow-sm">
              <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-400" />
              Level 7
            </div>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 transition-all duration-500"
                style={{ width: "81%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM TRUST & SOCIAL PROOF FOOTER */}
      <div className="relative z-10 mt-6 space-y-4">
        {/* TRUSTED & SECURE CARD */}
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/15 text-teal-300 border border-teal-400/20">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                Trusted &amp; Secure
              </p>
              <p className="text-[11px] text-slate-400">
                FERPA-aligned • Privacy-first • Enterprise-grade security
              </p>
            </div>
          </div>
          <Lock className="h-4 w-4 text-slate-500" />
        </div>

        {/* SOCIAL PROOF ROW */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/10">
          <div className="flex items-center gap-2">
            {/* Overlapping Avatars */}
            <div className="flex -space-x-2">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&h=64&q=80"
                alt="User Avatar"
                className="h-7 w-7 rounded-full border-2 border-[#030f26] object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&h=64&q=80"
                alt="User Avatar"
                className="h-7 w-7 rounded-full border-2 border-[#030f26] object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=64&h=64&q=80"
                alt="User Avatar"
                className="h-7 w-7 rounded-full border-2 border-[#030f26] object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=64&h=64&q=80"
                alt="User Avatar"
                className="h-7 w-7 rounded-full border-2 border-[#030f26] object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=64&h=64&q=80"
                alt="User Avatar"
                className="h-7 w-7 rounded-full border-2 border-[#030f26] object-cover"
              />
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
              <span>★★★★★</span>
              <span className="text-white font-extrabold ml-1">4.9/5</span>
            </div>
          </div>

          <p className="text-[11px] font-semibold text-slate-400">
            Trusted by 1,200+ institutions worldwide
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthBrandPanel;
