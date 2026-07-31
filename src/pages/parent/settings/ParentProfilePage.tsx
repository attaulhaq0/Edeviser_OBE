// =============================================================================
// ParentProfilePage — prototype-exact rebuild (parent-profile.html)
// =============================================================================
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { EdvToggle } from "@/components/ui/EdvToggle";
import { ParentButton } from "@/components/shared/ParentButton";
import { ParentSectionIcon } from "@/components/shared/ParentSectionIcon";
import WhyThisPopover from "@/components/shared/WhyThisPopover";
import { useAuth } from "@/hooks/useAuth";
import { useParentDashboardAggregate } from "@/hooks/useParentDashboardAggregate";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const ParentProfilePage = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const aggregate = useParentDashboardAggregate(user?.id);
  const kpis = aggregate.data?.kpis;
  const children = aggregate.data?.children ?? [];

  // Notification Preference state (persisted to profile)
  const [prefs, setPrefs] = useState({
    weekly_growth: true,
    wellbeing_only: true,
    celebrate_improvements: true,
    quiet_hours_enabled: true,
    quiet_start: "21:00",
    quiet_end: "07:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Qatar",
    muted_courses: new Set<string>(),
  });

  // Real Supabase Auth MFA enrollment state
  const [isMfaEnabled, setIsMfaEnabled] = useState(false);

  useEffect(() => {
    async function checkMfa() {
      try {
        const { data } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (data && data.currentLevel === "mfa2") {
          setIsMfaEnabled(true);
        }
      } catch {
        // Fallback
      }
    }
    checkMfa();
  }, []);

  const handleTogglePref = async (key: keyof typeof prefs, val: boolean) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    toast.success(
      val
        ? t("profile.alertsOn", "Alerts enabled 🔔")
        : t("profile.alertsOff", "Alerts muted 🔕")
    );

    if (user?.id) {
      try {
        await supabase
          .from("profiles")
          .update({
            notification_preferences: {
              ...((profile?.notification_preferences as Record<
                string,
                unknown
              >) ?? {}),
              [key]: val,
              timezone: prefs.timezone,
            } as never,
          })
          .eq("id", user.id);
      } catch {
        // Fallback
      }
    }
  };

  const toggleCourseMute = (course: string) => {
    setPrefs((prev) => {
      const nextMuted = new Set(prev.muted_courses);
      if (nextMuted.has(course)) {
        nextMuted.delete(course);
        toast.info(
          t("profile.unmutedCourse", "Unmuted alerts for {{course}}", {
            course,
          })
        );
      } else {
        nextMuted.add(course);
        toast.info(
          t("profile.mutedCourse", "Muted alerts for {{course}}", { course })
        );
      }
      return { ...prev, muted_courses: nextMuted };
    });
  };

  const name = profile?.full_name ?? "Nadia Hassan";
  const initials = name.slice(0, 1).toUpperCase();

  return (
    <div className="space-y-4 no-scrollbar">
      {/* ── 1 · Profile Header Card (.phdr matching parent-profile.html) ── */}
      <div className="rounded-[20px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            {/* Identity row */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  toast.info(
                    t("profile.changePhoto", "Photo update feature coming soon")
                  )
                }
                className="group relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-sky-600 text-xl font-black text-white shadow-md"
              >
                {initials}
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs shadow-xs group-hover:bg-slate-100">
                  📷
                </span>
              </button>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {name}
                </h1>
                <p className="text-xs font-semibold text-slate-500">
                  {t("profile.parentRole", "Parent / Guardian")}{" "}
                  <span className="text-slate-400">
                    · Guardian of{" "}
                    {children
                      .map((c) => c.student_name.split(" ")[0])
                      .join(" & ") || "Maya"}
                  </span>
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-2 pt-1">
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/50">
                <span className="text-sm">👨‍👩‍👧</span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {kpis?.linkedChildren ?? children.length ?? 2}{" "}
                  <span className="font-semibold text-slate-500">Children</span>
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/50">
                <span className="text-sm">🎓</span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {kpis?.totalCourses ?? 7}{" "}
                  <span className="font-semibold text-slate-500">Courses</span>
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/50">
                <span className="text-sm">📈</span>
                <span className="text-xs font-bold text-emerald-700">
                  {Math.round(kpis?.avgAttainment ?? 82)}%{" "}
                  <span className="font-semibold text-slate-500">
                    Avg attainment
                  </span>
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/50">
                <span className="text-sm">🔔</span>
                <span className="text-xs font-bold text-amber-700">
                  {kpis?.upcomingDeadlines ?? 2}{" "}
                  <span className="font-semibold text-slate-500">Alerts</span>
                </span>
              </div>
            </div>
          </div>

          {/* Actions & Contact */}
          <div className="space-y-3 lg:text-right">
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <ParentButton
                variant="ghost"
                size="sm"
                onClick={() =>
                  toast.info(t("profile.editDialog", "Edit profile modal"))
                }
              >
                ✏️ {t("profile.editProfile", "Edit profile")}
              </ParentButton>
              <ParentButton
                variant="primary"
                size="sm"
                onClick={() =>
                  toast.info(
                    t(
                      "profile.contactSchoolInfo",
                      "School Office: +974 4000 1234"
                    )
                  )
                }
              >
                ✉️ {t("profile.contactSchool", "Contact school")}
              </ParentButton>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 lg:justify-end">
              <span className="inline-flex items-center gap-1">
                ✉️ {profile?.email || "nadia.hassan@email.com"}
              </span>
              <span className="inline-flex items-center gap-1">
                📞 +974 5000 4321
              </span>
              <span className="inline-flex items-center gap-1">
                🔗 Linked since Sep 2024
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2 · Linked Learners Card ── */}
      <div className="rounded-[20px] border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ParentSectionIcon emoji="👨‍👩‍👧" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {t("profile.linkedLearners", "Linked learners")}
            </h2>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-100">
            {children.length || 2} linked
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {(children.length > 0
            ? children
            : [
                {
                  student_id: "m1",
                  student_name: "Maya Hassan",
                  grade: "Grade 11 · Gulf Academy",
                },
                {
                  student_id: "y1",
                  student_name: "Yusuf Hassan",
                  grade: "Grade 8 · Gulf Academy",
                },
              ]
          ).map((child, idx) => (
            <div
              key={child.student_id}
              className="flex items-center gap-3 py-3"
            >
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-black text-sm",
                  idx % 2 === 0
                    ? "bg-teal-100 text-teal-700"
                    : "bg-indigo-100 text-indigo-700"
                )}
              >
                {child.student_name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {child.student_name}
                </p>
                <p className="text-xs text-slate-500">
                  {"grade" in child
                    ? (child as { grade: string }).grade
                    : "Gulf Academy"}{" "}
                  · link verified ✓
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                Active
              </span>
            </div>
          ))}
        </div>

        <ParentButton
          variant="ghost"
          size="sm"
          onClick={() => navigate("/parent/children")}
          className="mt-3 w-full text-xs font-bold"
        >
          ＋ {t("profile.linkAnother", "Link another child")}
        </ParentButton>
      </div>

      {/* ── 3 · Quick Links Strip ── */}
      <div className="overflow-hidden rounded-2xl border border-[#eef2f6] bg-white divide-y divide-slate-100 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:divide-slate-800">
        <Link
          to="/parent/fees"
          className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          <span className="flex items-center gap-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <span className="text-lg">💳</span>
            {t("profile.feesPayments", "Fees & Payments")}
          </span>
          <span className="text-xs text-slate-400">→</span>
        </Link>
        <Link
          to="/parent/communications?tab=announcements"
          className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          <span className="flex items-center gap-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <span className="text-lg">📣</span>
            {t("profile.announcements", "Announcements")}
          </span>
          <span className="text-xs text-slate-400">→</span>
        </Link>
      </div>

      {/* ── 4 · 2-Column Grid: Privacy & Notification Preferences ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Privacy & what you can see */}
        <div className="rounded-[20px] border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ParentSectionIcon emoji="🔒" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                {t("profile.privacyTitle", "Privacy & what you can see")}
              </h2>
            </div>
            <WhyThisPopover
              title="Parent Privacy & Consent"
              reasons={[
                "You see growth, wellbeing signals and strengths — never raw exam scores or her private journal. Maya can see exactly what is shared with you.",
              ]}
            />
          </div>

          <div className="space-y-2.5">
            {[
              {
                label: t(
                  "profile.growthSummary",
                  "Growth & wellbeing summaries"
                ),
                status: "Shared",
                pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
              },
              {
                label: t("profile.rawScores", "Raw exam scores"),
                status: "Not shared",
                pill: "bg-blue-50 text-blue-700 border-blue-200",
              },
              {
                label: t("profile.privateJournal", "Private journal"),
                status: "Private to Maya",
                pill: "bg-blue-50 text-blue-700 border-blue-200",
              },
              {
                label: t("profile.tutorConvos", "Tutor conversations"),
                status: "Private to Maya",
                pill: "bg-blue-50 text-blue-700 border-blue-200",
              },
              {
                label: t("profile.teacherFeedback", "Teacher feedback"),
                status: "Shared",
                pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
              },
              {
                label: t("profile.attendanceRecord", "Attendance record"),
                status: "Shared",
                pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-700 dark:text-slate-300">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-bold",
                    item.pill
                  )}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Notification preferences (exact prototype EdvToggle switches) */}
        <div className="rounded-[20px] border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <ParentSectionIcon emoji="🔔" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {t("profile.notificationsTitle", "Notifications")}
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t("profile.weeklyGrowthStory", "Weekly growth story")}
                </p>
                <p className="text-xs text-slate-400">
                  Digest delivered every Sunday
                </p>
              </div>
              <EdvToggle
                checked={prefs.weekly_growth}
                onCheckedChange={(val) =>
                  handleTogglePref("weekly_growth", val)
                }
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t("profile.wellbeingAlertsOnly", "Wellbeing alerts only")}
                </p>
                <p className="text-xs text-slate-400">
                  Important habit and focus alerts
                </p>
              </div>
              <EdvToggle
                checked={prefs.wellbeing_only}
                onCheckedChange={(val) =>
                  handleTogglePref("wellbeing_only", val)
                }
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t("profile.celebrateImprovements", "Celebrate improvements")}
                </p>
                <p className="text-xs text-slate-400">
                  Milestone reached celebrations
                </p>
              </div>
              <EdvToggle
                checked={prefs.celebrate_improvements}
                onCheckedChange={(val) =>
                  handleTogglePref("celebrate_improvements", val)
                }
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t("profile.quietHours", "Quiet hours")}
                </p>
                <p className="text-xs text-slate-400">
                  Pause non-urgent alerts overnight ({prefs.timezone})
                </p>
              </div>
              <EdvToggle
                checked={prefs.quiet_hours_enabled}
                onCheckedChange={(val) =>
                  handleTogglePref("quiet_hours_enabled", val)
                }
              />
            </div>

            {prefs.quiet_hours_enabled && (
              <div className="flex items-center gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500 dark:border-slate-800">
                <span>From</span>
                <input
                  type="time"
                  value={prefs.quiet_start}
                  onChange={(e) =>
                    setPrefs({ ...prefs, quiet_start: e.target.value })
                  }
                  className="rounded-lg border border-slate-200 px-2 py-1 font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
                <span>to</span>
                <input
                  type="time"
                  value={prefs.quiet_end}
                  onChange={(e) =>
                    setPrefs({ ...prefs, quiet_end: e.target.value })
                  }
                  className="rounded-lg border border-slate-200 px-2 py-1 font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
            )}

            <div className="border-t border-slate-100 pt-2.5 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Mute course alerts
              </p>
              <p className="text-xs text-slate-400 mb-2">
                Stop notifications for a specific course
              </p>
              <div className="flex flex-wrap gap-2">
                {["Databases", "Writing", "Math"].map((course) => {
                  const isMuted = prefs.muted_courses.has(course);
                  return (
                    <button
                      key={course}
                      type="button"
                      onClick={() => toggleCourseMute(course)}
                      className={cn(
                        "rounded-xl border px-3 py-1 text-xs font-bold transition-colors",
                        isMuted
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                      )}
                    >
                      {course} {isMuted ? "🔕" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5 · Security & Access ── */}
      <div className="rounded-[20px] border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2">
          <ParentSectionIcon emoji="🔒" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            {t("profile.securityTitle", "Security & access")}
          </h2>
        </div>

        <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Change password
              </p>
              <p className="text-xs text-slate-400">
                Last changed 2 months ago
              </p>
            </div>
            <ParentButton
              variant="ghost"
              size="sm"
              onClick={() => toast.info("Opening password change…")}
            >
              Change
            </ParentButton>
          </div>

          <div className="flex items-center justify-between pt-3">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Two-factor authentication
            </span>
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-bold",
                isMfaEnabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              )}
            >
              {isMfaEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Active sessions
              </p>
              <p className="text-xs text-slate-400">1 device signed in</p>
            </div>
            <ParentButton
              variant="ghost"
              size="sm"
              onClick={() => toast.info("Reviewing active sessions…")}
            >
              Review
            </ParentButton>
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Export my data
              </p>
              <p className="text-xs text-slate-400">
                Download your account data as CSV
              </p>
            </div>
            <ParentButton
              variant="ghost"
              size="sm"
              onClick={() =>
                toast.success("Preparing account data export CSV…")
              }
            >
              Export
            </ParentButton>
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="text-sm font-bold text-red-600">
                Delete my account
              </p>
              <p className="text-xs text-slate-400">
                Anonymize profile & PII (cannot be undone)
              </p>
            </div>
            <ParentButton
              variant="danger"
              size="sm"
              onClick={() => {
                if (
                  window.confirm(
                    "Delete your account? This anonymizes your profile and cannot be undone."
                  )
                ) {
                  toast.error("Account deletion requested");
                }
              }}
            >
              Delete
            </ParentButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentProfilePage;
