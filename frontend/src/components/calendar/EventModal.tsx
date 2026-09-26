"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { CalendarEvent } from "@/lib/types";
import { addHours, format, parseISO } from "date-fns";
import { X, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const COLORS = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Pink", value: "#ec4899" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Green", value: "#10b981" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Red", value: "#ef4444" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Teal", value: "#14b8a6" },
];

// Popup for creating a new event or editing/deleting an existing one.
// Same component for both - if `event` is passed in it's edit mode.

function toDatetimeLocal(iso: string) {
  // Convert ISO string to "YYYY-MM-DDTHH:mm" for datetime-local input.
  // format() uses local time - just slicing the string gave UTC time, which was
  // off by the timezone offset
  return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");
}

// the input value has no timezone, new Date() treats it as local time -> convert to UTC ISO
function fromDatetimeLocal(val: string) {
  return new Date(val).toISOString();
}

interface Props {
  event?: CalendarEvent;         // present when editing
  defaultDate?: string;          // ISO string hint for new event
  currentUserId: string;
  onClose: () => void;
  onCreated: (ev: CalendarEvent) => void;
  onUpdated: (ev: CalendarEvent) => void;
  onDeleted: (id: string) => void;
}

export function EventModal({ event, defaultDate, currentUserId, onClose, onCreated, onUpdated, onDeleted }: Props) {
  const isEdit = !!event;

  // new events default to the start of the hour you clicked (or now), 1 hour long
  const defaultStart = defaultDate
    ? new Date(defaultDate)
    : new Date();
  defaultStart.setMinutes(0, 0, 0);
  const defaultEnd = addHours(defaultStart, 1);

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [color, setColor] = useState(event?.color ?? "#6366f1");
  const [startAt, setStartAt] = useState(
    toDatetimeLocal(event?.start_at ?? defaultStart.toISOString())
  );
  const [endAt, setEndAt] = useState(
    toDatetimeLocal(event?.end_at ?? defaultEnd.toISOString())
  );
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const start = fromDatetimeLocal(startAt);
    const end = fromDatetimeLocal(endAt);
    if (new Date(end) <= new Date(start)) {
      toast.error("End time must be after start time.");
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const updated = await api.events.update(event.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          color,
          start_at: start,
          end_at: end,
        });
        toast.success("Event updated");
        onUpdated(updated);
      } else {
        const created = await api.events.create({
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          color,
          start_at: start,
          end_at: end,
        });
        toast.success("Event created");
        onCreated(created);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!event) return;
    setLoading(true);
    try {
      await api.events.delete(event.id);
      toast.success("Event deleted");
      onDeleted(event.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const canDelete = isEdit; // either user can delete any shared event

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">
            {isEdit ? "Edit event" : "New event"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's happening?"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start</label>
              <input
                type="datetime-local"
                required
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End</label>
              <input
                type="datetime-local"
                required
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Optional location"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c.value,
                    outline: color === c.value ? `3px solid ${c.value}` : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Creator info (edit only) */}
          {isEdit && event.creator && (
            <p className="text-xs text-slate-400">
              Created by {event.creator.display_name}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {canDelete && (
              <>
                {deleteConfirm ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="text-sm text-red-600 border border-red-300 rounded-lg px-3 py-1.5 hover:bg-red-50 transition"
                  >
                    Confirm delete
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                    className="text-slate-400 hover:text-red-500 transition p-1.5"
                    title="Delete event"
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-slate-600 border border-slate-300 rounded-lg px-4 py-1.5 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-1.5 transition disabled:opacity-60"
              style={{ backgroundColor: color }}
            >
              {loading ? "Saving…" : isEdit ? "Save changes" : "Create event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
