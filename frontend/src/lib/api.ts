// All the calls to the backend go through here, so components never
// use fetch() directly. If an endpoint changes, this is the only place to update.
import type { CalendarEvent, Couple, EventCreate, EventUpdate, User } from "./types";

// NEXT_PUBLIC_ vars get baked into the JS at build time, so changing it
// on Railway needs a redeploy to take effect
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// the JWT from login/register is saved in localStorage under "cc_token"
function getToken(): string | null {
  // localStorage doesn't exist when Next.js renders on the server
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cc_token");
}

// wrapper around fetch that adds the auth header and turns errors into
// exceptions with the backend's "detail" message (so we can toast it)
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
  if (res.status === 204) return undefined as T; // 204 = no body (e.g. delete), res.json() would throw
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

// http://... -> ws://...  and  https://... -> wss://...
// token goes in the url because browser websockets can't send headers
export function wsUrl(coupleId: string): string {
  const token = getToken() ?? "";
  const wsBase = BASE.replace(/^http/, "ws");
  return `${wsBase}/ws/${coupleId}?token=${token}`;
}
