"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { CalendarEvent, Couple, User, WsMessage } from "@/lib/types";
import { useCalendarWs } from "@/hooks/useCalendarWs";
import { useReminders } from "@/hooks/useReminders";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { EventModal } from "@/components/calendar/EventModal";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, LogOut, Plus, Settings } from "lucide-react";
import toast from "react-hot-toast";

type ViewMode = "month" | "week" | "day";

export default function CalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalState, setModalState] = useState<{
    open: boolean;
    event?: CalendarEvent;
    defaultDate?: string;
  }>({ open: false });
  const [loading, setLoading] = useState(true);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("cc_token");
    if (!token) {
      router.replace("/");
      return;
    }

    Promise.all([api.auth.me(), api.couple.me().catch(() => null)])
      .then(([u, c]) => {
        setUser(u);
        if (!c) {
          router.replace("/pair");
          return;
        }
        setCouple(c);
      })
      .catch(() => {
        localStorage.removeItem("cc_token");
        router.replace("/");
      })
      .finally(() => setLoading(false));
  }, [router]);

  // ── Load events when couple/view/date changes ─────────────────────────────
  useEffect(() => {
    if (!couple) return;
    loadEvents();
  }, [couple, view, currentDate]);

  async function loadEvents() {
    let start: Date, end: Date;
    if (view === "month") {
      start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
      end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    } else if (view === "week") {
      start = startOfWeek(currentDate, { weekStartsOn: 0 });
      end = endOfWeek(currentDate, { weekStartsOn: 0 });
    } else {
      start = startOfDay(currentDate);
      end = endOfDay(currentDate);
    }
    try {
      const data = await api.events.list(start.toISOString(), end.toISOString());
      setEvents(data);
    } catch (err: any) {
      toast.error("Failed to load events: " + err.message);
    }
  }

  // ── Real-time WebSocket updates ────────────────────────────────────────────
  const handleWsMessage = useCallback((msg: WsMessage) => {
    if (msg.type === "event_created") {
      setEvents((prev) => {
        if (prev.find((e) => e.id === msg.event.id)) return prev;
        return [...prev, msg.event].sort(
          (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
        );
      });
      const other = couple?.members.find((m) => m.id !== user?.id);
      toast(`${other?.display_name ?? "Partner"} added "${msg.event.title}"`, { icon: "📅" });
    } else if (msg.type === "event_updated") {
      setEvents((prev) => prev.map((e) => (e.id === msg.event.id ? msg.event : e)));
    } else if (msg.type === "event_deleted") {
      setEvents((prev) => prev.filter((e) => e.id !== msg.event_id));
    }
  }, [couple, user]);

  useCalendarWs(couple?.id ?? null, handleWsMessage);
  useReminders(events);

  // ── Navigation ─────────────────────────────────────────────────────────────
  function navigate(dir: "prev" | "next") {
    setCurrentDate((d) => {
      if (view === "month") return dir === "prev" ? subMonths(d, 1) : addMonths(d, 1);
      if (view === "week") return dir === "prev" ? subWeeks(d, 1) : addWeeks(d, 1);
      return dir === "prev" ? subDays(d, 1) : addDays(d, 1);
    });
  }

  function headerLabel(): string {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const s = startOfWeek(currentDate, { weekStartsOn: 0 });
      const e = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
    }
    return format(currentDate, "EEEE, MMMM d, yyyy");
  }

  // ── Event CRUD callbacks ───────────────────────────────────────────────────
  function onEventCreated(ev: CalendarEvent) {
    setEvents((prev) =>
      [...prev, ev].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    );
    setModalState({ open: false });
  }

  function onEventUpdated(ev: CalendarEvent) {
    setEvents((prev) => prev.map((e) => (e.id === ev.id ? ev : e)));
    setModalState({ open: false });
  }

  function onEventDeleted(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setModalState({ open: false });
  }

  function handleSignOut() {
    localStorage.removeItem("cc_token");
    router.replace("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 animate-pulse text-lg">Loading…</div>
      </div>
    );
  }

  const partner = couple?.members.find((m) => m.id !== user?.id);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Nav */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <div className="text-xl">❤️</div>
        <h1 className="font-semibold text-slate-800 text-lg flex-1">Our Calendar</h1>

        {partner && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-pink-50 text-pink-600 border border-pink-200 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />
            {user?.display_name} &amp; {partner.display_name}
          </span>
        )}

        <button
          onClick={() => setModalState({ open: true })}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">New event</span>
        </button>

        <button
          onClick={handleSignOut}
          title="Sign out"
          className="text-slate-400 hover:text-slate-600 transition"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Calendar Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setCurrentDate(new Date())}
          className="text-xs font-medium border border-slate-300 rounded-md px-2 py-1 hover:bg-slate-50 transition"
        >
          Today
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate("prev")}
            className="p-1 rounded hover:bg-slate-100 transition"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-semibold text-slate-800 text-sm min-w-[180px] text-center">
            {headerLabel()}
          </span>
          <button
            onClick={() => navigate("next")}
            className="p-1 rounded hover:bg-slate-100 transition"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="ml-auto flex rounded-lg border border-slate-200 overflow-hidden">
          {(["month", "week", "day"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 text-xs font-medium capitalize transition ${
                view === v ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar View */}
      <main className="flex-1 overflow-auto">
        {view === "month" && (
          <MonthView
            currentDate={currentDate}
            events={events}
            currentUserId={user?.id ?? ""}
            onDayClick={(date) => {
              setView("day");
              setCurrentDate(date);
            }}
            onEventClick={(ev) => setModalState({ open: true, event: ev })}
            onCreateAt={(date) =>
              setModalState({ open: true, defaultDate: date.toISOString() })
            }
          />
        )}
        {view === "week" && (
          <WeekView
            currentDate={currentDate}
            events={events}
            currentUserId={user?.id ?? ""}
            onEventClick={(ev) => setModalState({ open: true, event: ev })}
            onCreateAt={(date) =>
              setModalState({ open: true, defaultDate: date.toISOString() })
            }
          />
        )}
        {view === "day" && (
          <DayView
            currentDate={currentDate}
            events={events}
            currentUserId={user?.id ?? ""}
            onEventClick={(ev) => setModalState({ open: true, event: ev })}
            onCreateAt={(date) =>
              setModalState({ open: true, defaultDate: date.toISOString() })
            }
          />
        )}
      </main>

      {/* Event Modal */}
      {modalState.open && (
        <EventModal
          event={modalState.event}
          defaultDate={modalState.defaultDate}
          currentUserId={user?.id ?? ""}
          onClose={() => setModalState({ open: false })}
          onCreated={onEventCreated}
          onUpdated={onEventUpdated}
          onDeleted={onEventDeleted}
        />
      )}
    </div>
  );
}
