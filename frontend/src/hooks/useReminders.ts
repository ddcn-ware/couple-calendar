"use client";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { differenceInMinutes, isFuture, parseISO } from "date-fns";
import type { CalendarEvent } from "@/lib/types";

// Shows a popup 30 min and 10 min before an event starts.
// Only works while the calendar tab is open - there's no email/push notification.
// Also only checks events that are loaded (i.e. in the current month/week/day on screen).

const REMIND_MINUTES = [30, 10];

export function useReminders(events: CalendarEvent[]) {
  // remembers which reminders already fired ("<eventId>-30") so they don't repeat
  const notified = useRef<Set<string>>(new Set());

  useEffect(() => {
    const check = () => {
      const now = new Date();
      for (const ev of events) {
        const start = parseISO(ev.start_at);
        if (!isFuture(start)) continue;
        const diff = differenceInMinutes(start, now);
        for (const threshold of REMIND_MINUTES) {
          const key = `${ev.id}-${threshold}`;
          // 2 minute window since we only check once a minute and could just miss it
          if (diff <= threshold && diff > threshold - 2 && !notified.current.has(key)) {
            notified.current.add(key);
            toast(`⏰ "${ev.title}" starts in ${threshold} minutes`, {
              duration: 6000,
              icon: "📅",
            });
          }
        }
      }
    };

    check();
    const interval = setInterval(check, 60_000); // check every minute
    return () => clearInterval(interval);
  }, [events]);
}
