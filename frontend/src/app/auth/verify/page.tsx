"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

function VerifyInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setErrorMsg("No token provided.");
      return;
    }

    api.auth
      .verify(token)
      .then(({ access_token }) => {
        localStorage.setItem("cc_token", access_token);
        toast.success("Logged in!");
        router.replace("/calendar");
      })
      .catch((err) => {
        setStatus("error");
        setErrorMsg(err.message ?? "Verification failed.");
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-pink-50">
      <div className="bg-white rounded-2xl shadow-md p-10 text-center max-w-sm w-full">
        {status === "loading" && (
          <>
            <div className="text-4xl mb-4 animate-pulse">✨</div>
            <p className="text-slate-600">Verifying your link…</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Verification failed</h2>
            <p className="text-slate-500 text-sm">{errorMsg}</p>
            <a href="/" className="mt-4 inline-block text-indigo-600 text-sm underline">
              Try again
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slate-400 animate-pulse">Loading…</div>
        </div>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
