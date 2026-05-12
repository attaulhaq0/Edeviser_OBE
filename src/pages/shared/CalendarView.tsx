import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useCalendarEvents, type CalendarEvent } from "@/hooks/useCalendar";
import Shimmer from "@/components/shared/Shimmer";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type ViewMode = "monthly" | "weekly";

const CalendarView = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  const { data: events = [], isLoading } = useCalendarEvents(month, year);

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const prev = () => {
    if (viewMode === "monthly") {
      if (month === 1) {
        setMonth(12);
        setYear(year - 1);
      } else setMonth(month - 1);
    } else {
      const d = new Date(selectedWeekStart);
      d.setDate(d.getDate() - 7);
      setSelectedWeekStart(d);
      // Sync month/year if week crosses month boundary
      setMonth(d.getMonth() + 1);
      setYear(d.getFullYear());
    }
  };

  const next = () => {
    if (viewMode === "monthly") {
      if (month === 12) {
        setMonth(1);
        setYear(year + 1);
      } else setMonth(month + 1);
    } else {
      const d = new Date(selectedWeekStart);
      d.setDate(d.getDate() + 7);
      setSelectedWeekStart(d);
      setMonth(d.getMonth() + 1);
      setYear(d.getFullYear());
    }
  };

  const eventsForDay = (day: number): CalendarEvent[] => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    return events.filter((e) => e.date?.startsWith(dateStr));
  };

  const eventsForDate = (date: Date): CalendarEvent[] => {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(
      2,
      "0"
    )}`;
    return events.filter((e) => e.date?.startsWith(dateStr));
  };

  // Week days for weekly view
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(selectedWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [selectedWeekStart]);

  const headerLabel =
    viewMode === "monthly"
      ? `${MONTHS[month - 1]} ${year}`
      : `${
          weekDays[0]?.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }) ?? ""
        } – ${
          weekDays[6]?.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }) ?? ""
        }`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as ViewMode)}
        >
          <TabsList className="gap-2 rounded-xl">
            <TabsTrigger value="monthly" className="rounded-xl text-xs">
              Monthly
            </TabsTrigger>
            <TabsTrigger value="weekly" className="rounded-xl text-xs">
              Weekly
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={prev}
            className="text-white hover:bg-white/20"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5" />
            <span className="text-lg font-bold tracking-tight">
              {headerLabel}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={next}
            className="text-white hover:bg-white/20"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4">
          {isLoading ? (
            <Shimmer className="h-64 rounded-lg" />
          ) : viewMode === "monthly" ? (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs font-bold text-slate-500 py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-20" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = eventsForDay(day);
                  const isToday =
                    day === now.getDate() &&
                    month === now.getMonth() + 1 &&
                    year === now.getFullYear();
                  return (
                    <div
                      key={day}
                      className={`h-20 rounded-lg border p-1 text-xs ${
                        isToday
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`font-semibold ${
                          isToday ? "text-blue-600" : "text-slate-700"
                        }`}
                      >
                        {day}
                      </span>
                      <div className="mt-0.5 space-y-0.5 overflow-hidden">
                        {dayEvents.slice(0, 2).map((e) => (
                          <Badge
                            key={e.id}
                            variant="outline"
                            className="text-[9px] px-1 py-0 truncate block"
                            style={{ borderColor: e.color, color: e.color }}
                          >
                            {e.title}
                          </Badge>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[9px] text-slate-400">
                            +{dayEvents.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Weekly View */
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((date, i) => {
                  const dayEvents = eventsForDate(date);
                  const isToday = date.toDateString() === now.toDateString();
                  return (
                    <div key={i} className="space-y-1">
                      <div
                        className={`text-center text-xs font-bold py-1 rounded-lg ${
                          isToday ? "bg-blue-500 text-white" : "text-slate-500"
                        }`}
                      >
                        <div>{DAYS[date.getDay()]}</div>
                        <div className="text-lg font-black">
                          {date.getDate()}
                        </div>
                      </div>
                      <div className="space-y-1 min-h-[120px]">
                        {dayEvents.map((e) => (
                          <div
                            key={e.id}
                            className="rounded-lg border p-1.5 text-xs"
                            style={{
                              borderColor: e.color,
                              backgroundColor: `${e.color}10`,
                            }}
                          >
                            <p
                              className="font-medium truncate"
                              style={{ color: e.color }}
                            >
                              {e.title}
                            </p>
                            {e.course_name && (
                              <p className="text-[9px] text-slate-500 truncate">
                                {e.course_name}
                              </p>
                            )}
                          </div>
                        ))}
                        {dayEvents.length === 0 && (
                          <div className="text-[9px] text-slate-300 text-center pt-4">
                            No events
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CalendarView;
