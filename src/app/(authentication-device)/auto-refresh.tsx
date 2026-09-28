"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// The AS pushes requests out of band; poll so they appear without a manual reload.
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
