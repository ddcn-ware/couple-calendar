import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  parseISO,
  differenceInMinutes,
  startOfDay,
} from "date-fns";
import type { CalendarEvent } from "@/lib/types";
import clsx from "clsx";

interface Props {
  currentDate: Date;
  events: CalendarEvent[];
  currentUserId: string;
  onEventClick: (ev: CalendarEvent) => void;
  onCreateAt: (date: Date) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function positionStyle(ev: CalendarEvent) {
  const start = parseISO(ev.start_at);
  const end = parseISO(ev.end_at);
  const dayStart = startOfDay(start);
  const top = (differenceInMinutes(start, dayStart) / 60) * 56; // 56px per hour
  const height = Math.max((differenceInMinutes(end, start) / 60) * 56, 20);
  return { top, height };
}

export function WeekView({ currentDate, events, currentUserId, onEventClick, onCreateAt }: Props) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="w-14 shrink-0" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={clsx(
              "flex-1 py-2 text-center border-l border-slate-100",
              isToday(day) && "bg-indigo-50"
            )}
          >
            <div className="text-xs text-slate-500 uppercase">{format(day, "EEE")}</div>
            <div
              className={clsx(
                "mx-auto w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mt-0.5",
                isToday(day) ? "bg-indigo-600 text-white" : "text-slate-700"
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable time grid */}
      <div className="flex overflow-y-auto flex-1">
        {/* Hour labels */}
        <div className="w-14 shrink-0">
          {HOURS.map((h) => (
            <div key={h} className="h-14 border-b border-slate-100 pr-2 flex items-start justify-end">
              <span className="text-xs text-slate-400 mt-0.5">
                {h === 0 ? "" : format(new Date(2000, 0, 1, h), "ha")}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const dayEvents = events.filter((ev) => isSameDay(parseISO(ev.start_at), day));
          return (
            <div
              key={day.toISOString()}
              className={clsx("flex-1 relative border-l border-slate-100", isToday(day) && "bg-indigo-50/20")}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const hour = Math.floor(y / 56);
                const d = new Date(day);
                d.setHours(hour, 0, 0, 0);
                onCreateAt(d);
              }}
            >
              {HOURS.map((h) => (
                <div key={h} className="h-14 border-b border-slate-100" />
              ))}

              {dayEvents.map((ev) => {
                const { top, height } = positionStyle(ev);
                return (
                  <button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    className="absolute left-0.5 right-0.5 rounded text-xs text-white px-1 py-0.5 text-left overflow-hidden leading-tight"
                    style={{ top, height, backgroundColor: ev.color }}
                    title={ev.title}
                  >
                    <span className="font-medium">{ev.title}</span>
                    {height > 30 && (
                      <span className="block opacity-80">
                        {format(parseISO(ev.start_at), "h:mma")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
