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
    <div
      className="auth-brand-panel relative flex flex-col justify-between overflow-hidden bg-cover bg-center px-8 py-8 text-white min-h-full lg:px-12 lg:py-10"
      style={{
        backgroundImage: "url('/auth-assets/01_auth_background_only.png')",
      }}
    >
      {/* Ambient radial glows */}
      <div
        className="pointer-events-none absolute end-4 top-10 h-80 w-80 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(56,189,248,0.4) 0%, rgba(20,184,166,0.2) 60%, transparent 80%)",
        }}
      />
      <div
        className="pointer-events-none absolute -start-10 bottom-16 h-72 w-72 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(14,165,233,0.3) 0%, rgba(99,102,241,0.2) 70%, transparent 90%)",
        }}
      />

      {/* TOP & CENTER CONTENT BLOCK */}
      <div className="relative z-10 flex flex-col gap-6">
        {/* BRAND HEADER: Transparent Glowing Infinity Logo Mark (Bigger, No Box) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              className="h-12 w-12 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.9)]"
              viewBox="0 0 60 30"
              fill="none"
            >
              <path
                d="M12 15 C12 8, 25 8, 30 15 C35 22, 48 22, 48 15 C48 8, 35 8, 30 15 C25 22, 12 22, 12 15 Z"
                stroke="url(#infinityHeaderGlow)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="15" cy="13" r="1.5" fill="#38bdf8" />
              <circle cx="45" cy="17" r="1.5" fill="#2dd4bf" />
              <defs>
                <linearGradient
                  id="infinityHeaderGlow"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#00d2ff" />
                  <stop offset="50%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#00f2fe" />
                </linearGradient>
              </defs>
            </svg>
            <span className="text-2xl font-black tracking-wider text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
              E DEVISER
            </span>
          </div>

          {/* Product Positioning Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-3.5 py-1 text-xs font-bold text-teal-300 backdrop-blur-md shadow-sm">
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
            {t("brand.badge", "Outcome-Based • Habit-Driven • Future-Ready")}
          </div>
        </div>

        {/* HERO SECTION: HEADLINE + MASCOT & LEARNING PATH */}
        <div className="relative grid grid-cols-1 items-center gap-6 lg:grid-cols-12 mt-2">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-3">
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

          {/* Right Mascot Column */}
          <div className="hidden lg:col-span-5 lg:flex relative items-center justify-center min-h-[160px]">
            {/* Milestones / Learning Journey Path behind mascot */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <svg
                className="w-full h-full"
                viewBox="0 0 200 130"
                fill="none"
                preserveAspectRatio="none"
              >
                {/* Curved Hill Surface */}
                <path
                  d="M0 130 Q 100 75 200 110"
                  fill="none"
                  stroke="rgba(30, 58, 138, 0.4)"
                  strokeWidth="50"
                />
                {/* Dotted path */}
                <path
                  d="M20 105 Q 95 65 175 25"
                  stroke="url(#pathGradient)"
                  strokeWidth="3"
                  strokeDasharray="4 4"
                />
                <defs>
                  <linearGradient id="pathGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#2dd4bf" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Path Node 1 */}
              <div className="absolute start-[25%] bottom-[30%] flex h-6 w-6 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-950/80 text-cyan-300 shadow-[0_0_10px_rgba(56,189,248,0.5)]">
                <Target className="h-3 w-3" />
              </div>
              {/* Path Node 2 */}
              <div className="absolute start-[55%] bottom-[50%] flex h-6 w-6 items-center justify-center rounded-full border border-blue-400/50 bg-blue-950/80 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                <TrendingUp className="h-3 w-3" />
              </div>
              {/* Path Node 3 (Star) */}
              <div className="absolute start-[78%] bottom-[70%] flex h-6 w-6 items-center justify-center rounded-full border border-amber-400/50 bg-amber-950/80 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                <Star className="h-3 w-3 fill-amber-300" />
              </div>
              {/* Flag at peak */}
              <div className="absolute end-[5%] top-[8%] text-teal-300">
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

        {/* COMPACT LEFT-ALIGNED CARDS CONTAINER */}
        <div className="flex w-full max-w-[520px] flex-col gap-4 mt-1">
          {/* DUAL ENGINE ARCHITECTURE CARDS */}
          <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* OBE Engine Card */}
            <div className="relative rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#071d47]/95 via-[#051638]/95 to-[#030e26]/95 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all hover:border-cyan-400/60 hover:shadow-[0_14px_40px_rgba(34,211,238,0.25)]">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/20 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.5)]">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">
                OBE Engine
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-300/90">
                Focuses on CLO/PLO/ILO mastery and measurable outcomes.
              </p>
            </div>

            {/* 3D Glowing Infinity Ribbon Connector Loop */}
            <div className="absolute start-1/2 top-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 sm:flex">
              <div className="flex h-10 w-16 items-center justify-center rounded-full border border-cyan-300/50 bg-gradient-to-r from-teal-500 via-cyan-400 to-blue-600 p-1 shadow-[0_0_25px_rgba(34,211,238,0.85)] animate-pulse">
                <svg
                  className="w-full h-full text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                  viewBox="0 0 60 30"
                  fill="none"
                >
                  <path
                    d="M10 15 C10 7, 25 7, 30 15 C35 23, 50 23, 50 15 C50 7, 35 7, 30 15 C25 23, 10 23, 10 15 Z"
                    stroke="#ffffff"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Habit Engine Card */}
            <div className="relative rounded-2xl border border-blue-500/30 bg-gradient-to-br from-[#071d47]/95 via-[#051638]/95 to-[#030e26]/95 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all hover:border-blue-400/60 hover:shadow-[0_14px_40px_rgba(59,130,246,0.25)]">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/20 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                <Target className="h-5 w-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">
                Habit Engine
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-300/90">
                Focuses on streaks, XP, rewards, and mastery paths.
              </p>
            </div>
          </div>

          {/* YOUR LEARNING JOURNEY PROGRESS CARD */}
          <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-[#071d47]/95 via-[#051638]/95 to-[#030e26]/95 p-4 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all hover:border-cyan-400/40">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">Your Learning Journey</span>
              <span className="text-cyan-300">
                <span className="text-white font-extrabold">XP 2,450</span> /
                3,000
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.35)]">
                <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-400" />
                Level 7
              </div>
              <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800/90 border border-slate-700/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-300 shadow-[0_0_14px_rgba(34,211,238,0.8)] transition-all duration-500"
                  style={{ width: "81%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM TRUST & SECURE FOOTER */}
      <div className="relative z-10 mt-6 w-full max-w-[520px]">
        <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-[#071d47]/95 via-[#051638]/95 to-[#030e26]/95 p-4 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-3">
          {/* Security Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-500/20 text-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.5)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Trusted &amp; Secure
                </h3>
                <p className="text-[11px] text-slate-300/80 font-medium">
                  FERPA aligned • Privacy-first • Enterprise-grade security
                </p>
              </div>
            </div>
            <Lock className="h-4 w-4 text-slate-400" />
          </div>

          {/* Social Proof Row */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 backdrop-blur-md">
            <div className="flex -space-x-2">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&h=64&q=80"
                alt="User Avatar"
                className="h-6.5 w-6.5 rounded-full border-2 border-[#030f26] object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&h=64&q=80"
                alt="User Avatar"
                className="h-6.5 w-6.5 rounded-full border-2 border-[#030f26] object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=64&h=64&q=80"
                alt="User Avatar"
                className="h-6.5 w-6.5 rounded-full border-2 border-[#030f26] object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=64&h=64&q=80"
                alt="User Avatar"
                className="h-6.5 w-6.5 rounded-full border-2 border-[#030f26] object-cover"
              />
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-white font-extrabold ms-1">4.9/5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthBrandPanel;
