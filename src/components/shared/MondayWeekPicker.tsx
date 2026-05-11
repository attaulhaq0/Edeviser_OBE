import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format, endOfWeek } from "date-fns";
import { useTranslation } from "react-i18next";
import "react-day-picker/src/style.css";

export interface MondayWeekPickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
}

/**
 * Week picker that only allows selecting Mondays.
 * Displays "Week of {Mon} – {Sun}" format.
 *
 * Design: ADR-05, §8.9
 * Requirements: 2.19
 *
 * Note: Requires react-day-picker to be installed (Task 35).
 *
 * @example
 * <MondayWeekPicker value={date} onChange={setDate} />
 */
const MondayWeekPicker = ({ value, onChange }: MondayWeekPickerProps) => {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  const handleSelect = (date: Date | undefined) => {
    if (date && date.getDay() === 1) {
      // Monday is day 1
      onChange(date);
      setOpen(false);
    }
  };

  const displayText = value
    ? `${t("weekPicker.weekOf")} ${format(value, "MMM d")} – ${format(
        endOfWeek(value),
        "MMM d"
      )}`
    : t("weekPicker.selectWeek");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <Calendar className="h-4 w-4 me-2" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DayPicker
          mode="single"
          selected={value ?? undefined}
          onSelect={handleSelect}
          disabled={(date) => date.getDay() !== 1} // Only allow Mondays
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

export { MondayWeekPicker };
export default MondayWeekPicker;
