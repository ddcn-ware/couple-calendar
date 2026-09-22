"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Magic link auth has been replaced with email/password.
// This page just redirects to home.
export default function VerifyPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
