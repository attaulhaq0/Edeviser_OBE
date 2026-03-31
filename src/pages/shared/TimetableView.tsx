import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { useTimetableSlots, type TimetableSlot } from '@/hooks/useTimetable';
import Shimmer from '@/components/shared/Shimmer';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS = [1, 2, 3, 4, 5]; // Mon–Fri
const HOURS = Array.from({ length: 12 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

const SLOT_TYPE_LABELS: Record<string, string> = {
  lecture: 'LEC',
  lab: 'LAB',
  tutorial: 'TUT',
};

const SLOT_TYPE_STYLES: Record<string, string> = {
  lecture: 'bg-blue-100 text-blue-700',
  lab: 'bg-green-100 text-green-700',
  tutorial: 'bg-purple-100 text-purple-700',
};

const TimetableView = () => {
  const { data: slots = [], isLoading } = useTimetableSlots();

  const getSlot = (day: number, hour: string): TimetableSlot | undefined =>
    slots.find((s) => s.day_of_week === day && s.start_time?.startsWith(hour));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Timetable</h1>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <Clock className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Weekly Schedule</h2>
        </div>
        <div className="p-4 overflow-x-auto">
          {isLoading ? (
            <Shimmer className="h-64 rounded-lg" />
          ) : (
            <table className="w-full text-xs border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th className="p-2 border border-slate-200 bg-slate-50 text-slate-500 font-bold w-20">
                    Time
                  </th>
                  {WEEKDAYS.map((d) => (
                    <th
                      key={d}
                      className="p-2 border border-slate-200 bg-slate-50 text-slate-500 font-bold"
                    >
                      {DAYS[d]}
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
                          style={slot?.color ? { backgroundColor: `${slot.color}08` } : undefined}
                        >
                          {slot && (
                            <div
                              className="rounded-lg border p-2 space-y-1"
                              style={{
                                borderColor: slot.color ?? '#3b82f6',
                                backgroundColor: `${slot.color ?? '#3b82f6'}15`,
                              }}
                            >
                              <p
                                className="font-semibold truncate"
                                style={{ color: slot.color ?? '#3b82f6' }}
                              >
                                {slot.course_name || slot.section_code || 'Class'}
                              </p>
                              {slot.section_code && (
                                <p className="text-slate-500 text-[10px]">
                                  Section {slot.section_code}
                                </p>
                              )}
                              <div className="flex items-center gap-1">
                                {slot.slot_type && (
                                  <Badge
                                    className={`text-[9px] px-1 py-0 ${SLOT_TYPE_STYLES[slot.slot_type] ?? 'bg-gray-100 text-gray-700'}`}
                                  >
                                    {SLOT_TYPE_LABELS[slot.slot_type] ?? slot.slot_type}
                                  </Badge>
                                )}
                                {slot.room && (
                                  <span className="text-slate-400 text-[10px]">{slot.room}</span>
                                )}
                              </div>
                              <p className="text-slate-400 text-[10px]">
                                {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
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
          {Array.from(new Set(slots.map((s) => s.course_name).filter(Boolean))).map((name) => {
            const slot = slots.find((s) => s.course_name === name);
            return (
              <div key={name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: slot?.color ?? '#3b82f6' }}
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

export default TimetableView;
