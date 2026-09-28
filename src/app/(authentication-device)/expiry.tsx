"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

const remaining = (expiresAt: number) => Math.max(0, expiresAt - Math.floor(Date.now() / 1000));

export function Expiry({ expiresAt }: { expiresAt: number }) {
  // null until mounted so server and client render the same first frame.
  const [secs, setSecs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setSecs(remaining(expiresAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (secs === null) return null;
  const label =
    secs === 0
      ? "Expired"
      : `Expires in ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
      <Clock className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
