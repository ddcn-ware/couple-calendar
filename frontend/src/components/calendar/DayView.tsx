import {
  format,
  isSameDay,
  parseISO,
  differenceInMinutes,
  startOfDay,
  isToday,
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
  const top = (differenceInMinutes(start, dayStart) / 60) * 64;
  const height = Math.max((differenceInMinutes(end, start) / 60) * 64, 24);
  return { top, height };
}

export function DayView({ currentDate, events, currentUserId, onEventClick, onCreateAt }: Props) {
  const dayEvents = events.filter((ev) => isSameDay(parseISO(ev.start_at), currentDate));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={clsx(
          "bg-white border-b border-slate-200 py-3 px-4 text-center sticky top-0 z-10",
          isToday(currentDate) && "bg-indigo-50"
        )}
      >
        <div className="text-xs text-slate-500 uppercase">{format(currentDate, "EEEE")}</div>
        <div
          className={clsx(
            "mx-auto w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mt-0.5",
            isToday(currentDate) ? "bg-indigo-600 text-white" : "text-slate-700"
          )}
        >
          {format(currentDate, "d")}
        </div>
      </div>

      {/* Time grid */}
      <div className="flex overflow-y-auto flex-1">
        {/* Hour labels */}
        <div className="w-16 shrink-0">
          {HOURS.map((h) => (
            <div key={h} className="h-16 border-b border-slate-100 pr-2 flex items-start justify-end">
              <span className="text-xs text-slate-400 mt-0.5">
                {h === 0 ? "" : format(new Date(2000, 0, 1, h), "ha")}
              </span>
            </div>
          ))}
        </div>

        {/* Events column */}
        <div
          className="flex-1 relative border-l border-slate-100"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const hour = Math.floor(y / 64);
            const d = new Date(currentDate);
            d.setHours(hour, 0, 0, 0);
            onCreateAt(d);
          }}
        >
          {HOURS.map((h) => (
            <div key={h} className="h-16 border-b border-slate-100" />
          ))}

          {dayEvents.map((ev) => {
            const { top, height } = positionStyle(ev);
            return (
              <button
                key={ev.id}
                onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                className="absolute left-1 right-2 rounded-lg text-white px-2 py-1 text-left overflow-hidden text-sm"
                style={{ top, height, backgroundColor: ev.color }}
                title={ev.title}
              >
                <div className="font-semibold leading-tight truncate">{ev.title}</div>
                {height > 36 && (
                  <div className="text-xs opacity-80 mt-0.5">
                    {format(parseISO(ev.start_at), "h:mma")} – {format(parseISO(ev.end_at), "h:mma")}
                  </div>
                )}
                {ev.location && height > 56 && (
                  <div className="text-xs opacity-70 truncate mt-0.5">📍 {ev.location}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
