import type { CalendarEvent, Couple, EventCreate, EventUpdate, User } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cc_token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (email: string, password: string, display_name?: string): Promise<{ access_token: string }> =>
      request("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, display_name }),
      }),

    login: (email: string, password: string): Promise<{ access_token: string }> =>
      request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    me: (): Promise<User> => request("/auth/me"),

    updateMe: (display_name: string): Promise<User> =>
      request("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ display_name }),
      }),
  },

  // ── Couple ──────────────────────────────────────────────────────────────────
  couple: {
    create: (): Promise<Couple> => request("/couple/create", { method: "POST" }),
    join: (invite_code: string): Promise<Couple> =>
      request("/couple/join", {
        method: "POST",
        body: JSON.stringify({ invite_code }),
      }),
    me: (): Promise<Couple> => request("/couple/me"),
    leave: () => request("/couple/leave", { method: "DELETE" }),
  },

  // ── Events ──────────────────────────────────────────────────────────────────
  events: {
    list: (start?: string, end?: string): Promise<CalendarEvent[]> => {
      const params = new URLSearchParams();
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      return request(`/events?${params}`);
    },
    create: (data: EventCreate): Promise<CalendarEvent> =>
      request("/events", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: EventUpdate): Promise<CalendarEvent> =>
      request(`/events/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string): Promise<void> =>
      request(`/events/${id}`, { method: "DELETE" }),
  },
};

export function wsUrl(coupleId: string): string {
  const token = getToken() ?? "";
  const wsBase = BASE.replace(/^http/, "ws");
  return `${wsBase}/ws/${coupleId}?token=${token}`;
}
