import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CalendarClock, MapPin } from "lucide-react";
import { useTimetableSlots, type TimetableSlot } from "@/hooks/useTimetable";
import Shimmer from "@/components/shared/Shimmer";
import { NoTimetable } from "@/components/shared/EmptyState";
import i18n from "@/lib/i18n";
import { resolveLocalizationGate } from "@/lib/localization";
import {
  computeTimetableNow,
  formatDurationParts,
  type TimetableNowContext,
} from "@/lib/timetableNow";

const WEEKDAYS = [1, 2, 3, 4, 5]; // Mon–Fri
const HOURS = Array.from(
  { length: 12 },
  (_, i) => `${String(i + 8).padStart(2, "0")}:00`
);

const SLOT_TYPE_STYLES: Record<string, string> = {
  lecture: "bg-blue-100 text-blue-700",
  lab: "bg-green-100 text-green-700",
  tutorial: "bg-purple-100 text-purple-700",
};

const TimetableView = () => {
  const { t } = useTranslation("common");
  const { data: slots = [], isLoading } = useTimetableSlots();

  // R13.5: if neither an English nor an Arabic localization is available for
  // the timetable, block display entirely rather than render an unlocalized
  // timetable. The decision routes through the centralized localization-policy
  // gate (`block-only` policy) shared with the weekly planner.
  const localizationGate = resolveLocalizationGate(
    (lng) => i18n.hasResourceBundle(lng, "common"),
    "block-only"
  );

  const getSlot = (day: number, hour: string): TimetableSlot | undefined =>
    slots.find((s) => s.day_of_week === day && s.start_time?.startsWith(hour));

  const slotTypeLabel = (type: string | null | undefined): string =>
    type ? t(`timetable.slotType.${type}`, { defaultValue: type }) : "";

  const dayLabel = (day: number): string => t(`timetable.days.${day}`);

  // Current/next class context (R12.4, R13.2, R21.3). Computed at render so the
  // countdown reflects the latest data; the heavy lifting lives in the pure
  // `computeTimetableNow` helper for testability.
  const nowContext = computeTimetableNow(slots, new Date());

  // R13.5: block the timetable surface entirely when no supported localization
  // is available, rather than rendering raw keys / unlocalized text.
  if (localizationGate === "blocked") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("timetable.title")}
        </h1>
      </div>

      {!isLoading && slots.length > 0 && (
        <CurrentClassPanel context={nowContext} />
      )}

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <Clock className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            {t("timetable.weeklySchedule")}
          </h2>
        </div>
        <div className="p-4 overflow-x-auto">
          {isLoading ? (
            <Shimmer className="h-64 rounded-lg" />
          ) : slots.length === 0 ? (
            <NoTimetable className="border-0 shadow-none" />
          ) : (
            <table className="w-full text-xs border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th className="p-2 border border-slate-200 bg-slate-50 text-slate-500 font-bold w-20">
                    {t("timetable.time")}
                  </th>
                  {WEEKDAYS.map((d) => (
                    <th
                      key={d}
                      className="p-2 border border-slate-200 bg-slate-50 text-slate-500 font-bold"
                    >
                      {dayLabel(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour}>
                    <td className="p-2 border border-slate-200 text-slate-400 font-mono text-center">
                      {hour}
                    </td>
                    {WEEKDAYS.map((day) => {
                      const slot = getSlot(day, hour);
                      return (
                        <td
                          key={day}
                          className="p-1.5 border border-slate-200 align-top"
                          style={
                            slot?.color
                              ? { backgroundColor: `${slot.color}08` }
                              : undefined
                          }
                        >
                          {slot && (
                            <div
                              className="rounded-lg border p-2 space-y-1"
                              style={{
                                borderColor: slot.color ?? "#3b82f6",
                                backgroundColor: `${slot.color ?? "#3b82f6"}15`,
                              }}
                            >
                              <p
                                className="font-semibold truncate"
                                style={{ color: slot.color ?? "#3b82f6" }}
                              >
                                {slot.course_name ||
                                  slot.section_code ||
                                  t("timetable.class")}
                              </p>
                              {slot.section_code && (
                                <p className="text-slate-500 text-[10px]">
                                  {t("timetable.sectionLabel", {
                                    code: slot.section_code,
                                  })}
                                </p>
                              )}
                              <div className="flex items-center gap-1">
                                {slot.slot_type && (
                                  <Badge
                                    className={`text-[9px] px-1 py-0 ${
                                      SLOT_TYPE_STYLES[slot.slot_type] ??
                                      "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {slotTypeLabel(slot.slot_type)}
                                  </Badge>
                                )}
                                {slot.room && (
                                  <span className="text-slate-400 text-[10px]">
                                    {slot.room}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-400 text-[10px]">
                                {slot.start_time?.slice(0, 5)} –{" "}
                                {slot.end_time?.slice(0, 5)}
                              </p>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Legend */}
      {!isLoading && slots.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Array.from(
            new Set(slots.map((s) => s.course_name).filter(Boolean))
          ).map((name) => {
            const slot = slots.find((s) => s.course_name === name);
            return (
              <div
                key={name}
                className="flex items-center gap-1.5 text-xs text-slate-600"
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: slot?.color ?? "#3b82f6" }}
                />
                <span>{name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Compact panel summarizing the class happening now or coming up next, with
 * the time remaining until the relevant transition. Pure presentational: all
 * timing logic comes from `computeTimetableNow`.
 */
const CurrentClassPanel = ({ context }: { context: TimetableNowContext }) => {
  const { t } = useTranslation("common");

  if (context.status === "none" || context.slot === null) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-slate-100">
          <CalendarClock className="h-5 w-5 text-slate-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {t("timetable.now.noUpcoming")}
          </p>
          <p className="text-xs text-slate-500">
            {t("timetable.now.noUpcomingHint")}
          </p>
        </div>
      </Card>
    );
  }

  const { slot, status, minutes } = context;
  const isNow = status === "in_class";
  const color = slot.color ?? "#3b82f6";
  const remaining = formatRemaining(minutes ?? 0, t);
  const countdownLabel = isNow
    ? t("timetable.now.endsIn", { time: remaining })
    : t("timetable.now.startsIn", { time: remaining });

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${color}1f` }}
        >
          <CalendarClock className="h-5 w-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <Badge
              className={
                isNow
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              }
            >
              {isNow
                ? t("timetable.now.happeningNow")
                : t("timetable.now.upNext")}
            </Badge>
            <span className="text-xs font-medium text-slate-500">
              {countdownLabel}
            </span>
          </div>
          <p
            className="text-base font-bold tracking-tight truncate"
            style={{ color }}
          >
            {slot.course_name || slot.section_code || t("timetable.class")}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="font-mono">
              {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
            </span>
            {slot.section_code && (
              <span>
                {t("timetable.sectionLabel", { code: slot.section_code })}
              </span>
            )}
            {slot.room && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {slot.room}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

/**
 * Render a non-negative minute count as a short localized duration string
 * (e.g. "1d 2h", "45m"). Falls back to a "less than a minute" label when the
 * count rounds to zero so the countdown is never blank.
 */
const formatRemaining = (
  totalMinutes: number,
  t: (key: string, options?: Record<string, unknown>) => string
): string => {
  const { days, hours, minutes } = formatDurationParts(totalMinutes);
  if (days === 0 && hours === 0 && minutes === 0) {
    return t("timetable.remaining.lessThanMinute");
  }
  const parts: string[] = [];
  if (days > 0) parts.push(t("timetable.remaining.days", { value: days }));
  if (hours > 0) parts.push(t("timetable.remaining.hours", { value: hours }));
  if (minutes > 0) {
    parts.push(t("timetable.remaining.minutes", { value: minutes }));
  }
  return parts.join(" ");
};

export default TimetableView;
