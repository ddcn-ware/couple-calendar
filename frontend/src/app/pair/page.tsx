"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Couple } from "@/lib/types";
import toast from "react-hot-toast";

export default function PairPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [couple, setCouple] = useState<Couple | null>(null);

  async function handleCreate() {
    setLoading(true);
    try {
      const c = await api.couple.create();
      setCouple(c);
      toast.success("Couple space created!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const c = await api.couple.join(code);
      setCouple(c);
      toast.success("Joined couple space!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (couple) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-pink-50 px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">You're paired!</h2>
          <p className="text-slate-500 text-sm mb-4">
            Share this invite code with your partner so they can join:
          </p>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl py-4 px-6 text-3xl font-mono font-bold tracking-widest text-indigo-700 mb-6">
            {couple.invite_code}
          </div>
          <p className="text-slate-400 text-xs mb-6">
            Members: {couple.members.map((m) => m.display_name).join(" & ")}
          </p>
          <button
            onClick={() => router.replace("/calendar")}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg text-sm transition"
          >
            Go to calendar →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-pink-50 px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">💑</div>
          <h1 className="text-xl font-bold text-slate-900">Set up your shared calendar</h1>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-slate-200 mb-6 overflow-hidden">
          {(["create", "join"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium transition ${
                tab === t ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t === "create" ? "Create space" : "Join with code"}
            </button>
          ))}
        </div>

        {tab === "create" ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Create a new shared calendar space. You'll get a 6-character invite code to share with your partner.
            </p>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create couple space"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <p className="text-sm text-slate-500">
              Enter the invite code your partner shared with you.
            </p>
            <input
              type="text"
              required
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD12"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-center text-xl font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-60"
            >
              {loading ? "Joining…" : "Join space"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
