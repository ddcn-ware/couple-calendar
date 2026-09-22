"use client";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { differenceInMinutes, isFuture, parseISO } from "date-fns";
import type { CalendarEvent } from "@/lib/types";

const REMIND_MINUTES = [30, 10];

export function useReminders(events: CalendarEvent[]) {
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
