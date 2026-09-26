import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  format,
} from "date-fns";
import type { CalendarEvent } from "@/lib/types";
import clsx from "clsx";

interface Props {
  currentDate: Date;
  events: CalendarEvent[];
  currentUserId: string;
  onDayClick: (date: Date) => void;
  onEventClick: (ev: CalendarEvent) => void;
  onCreateAt: (date: Date) => void;
}

// Classic month grid. Clicking an empty part of a day opens "new event",
// clicking the day number jumps to day view, clicking an event opens it.
export function MonthView({ currentDate, events, currentUserId, onDayClick, onEventClick, onCreateAt }: Props) {
  // grid starts on the Sunday before the 1st and ends on the Saturday after
  // the last day, so it's always full weeks (5 or 6 rows)
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // an event shows on a day if it starts, ends, or spans across that day
  function eventsForDay(day: Date) {
    return events.filter((ev) => {
      const s = parseISO(ev.start_at);
      const e = parseISO(ev.end_at);
      return isSameDay(s, day) || isSameDay(e, day) || (s < day && e > day);
    });
  }

  return (
    <div className="h-full flex flex-col">
      {/* Day-of-week header */}
      <div className="calendar-grid border-b border-slate-200 bg-white">
        {DOW.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="calendar-grid flex-1">
        {days.map((day) => {
          const dayEvents = eventsForDay(day);
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={clsx(
                "border-b border-r border-slate-100 min-h-[100px] p-1 cursor-pointer group",
                !inMonth && "bg-slate-50",
                today && "bg-indigo-50/30"
              )}
              onClick={() => onCreateAt(day)}
            >
              <div className="flex justify-between items-start mb-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onDayClick(day); }}
                  className={clsx(
                    "w-7 h-7 rounded-full text-sm font-medium flex items-center justify-center transition",
                    today ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-200",
                    !inMonth && "text-slate-400"
                  )}
                >
                  {format(day, "d")}
                </button>
              </div>

              <div className="space-y-0.5">
                {/* only room for 3, the rest go in "+N more" */}
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    className="w-full text-left truncate text-xs px-1.5 py-0.5 rounded font-medium text-white"
                    style={{ backgroundColor: ev.color }}
                    title={ev.title}
                  >
                    {/* little dot = your partner made this one */}
                    {ev.creator_id !== currentUserId && "• "}
                    {ev.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDayClick(day); }}
                    className="text-xs text-slate-500 pl-1"
                  >
                    +{dayEvents.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
