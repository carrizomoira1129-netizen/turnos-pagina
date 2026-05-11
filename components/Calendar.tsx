"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
  addMonths,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarProps {
  onSelectDate: (date: Date) => void;
  selectedDate: Date | null;
  bookedDates: string[];
}

const WORKING_DAYS = [1, 2, 3, 4, 5, 6]; // Mon-Sat

export default function Calendar({
  onSelectDate,
  selectedDate,
  bookedDates,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = startOfDay(new Date());

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDayOfMonth = getDay(startOfMonth(currentMonth));
  // Adjust for Mon-start (0=Mon, 6=Sun)
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const isWorkingDay = (date: Date) => WORKING_DAYS.includes(getDay(date));
  const isPast = (date: Date) => isBefore(date, today);

  const isSelectable = (date: Date) =>
    isWorkingDay(date) && !isPast(date);

  const hasBookings = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookedDates.includes(dateStr);
  };

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-semibold text-lg capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrevMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToNextMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-white/30 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {daysInMonth.map((date) => {
          const selectable = isSelectable(date);
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
          const isCurrentDay = isToday(date);
          const hasAppts = hasBookings(date);
          const past = isPast(date);
          const nonWorking = !isWorkingDay(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => selectable && onSelectDate(date)}
              disabled={!selectable}
              className={`
                relative aspect-square rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-0.5
                ${isSelected
                  ? "bg-[#e4c69a] text-[#0D0D0D] shadow-lg shadow-[#e4c69a]/20"
                  : selectable && isCurrentDay
                  ? "bg-white/10 text-white border border-[#e4c69a]/40 hover:bg-[#e4c69a]/10"
                  : selectable
                  ? "text-white hover:bg-white/5 hover:text-[#e4c69a]"
                  : past || nonWorking
                  ? "text-white/15 cursor-not-allowed"
                  : "text-white/30 cursor-not-allowed"
                }
              `}
            >
              <span>{format(date, "d")}</span>
              {hasAppts && !isSelected && selectable && (
                <span className="w-1 h-1 rounded-full bg-[#e4c69a]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <span className="w-2.5 h-2.5 rounded-full bg-[#e4c69a]" />
          Con turnos reservados
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
          No disponible
        </div>
      </div>
    </div>
  );
}
