"use client";

import * as React from "react";

function initials(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

function hashColor(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1)
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 70% 55%)`;
}

export function Avatar({
  name,
  status,
  size = 64,
  highlight = false,
}: {
  name: string;
  status: "ready" | "waiting";
  size?: number;
  highlight?: boolean;
}) {
  const bg = hashColor(name);
  const ring = highlight
    ? "ring-2 ring-primary shadow-neon"
    : "ring-1 ring-white/10";

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative rounded-2xl ${ring} bg-white/5 border border-white/10 overflow-hidden`}
        style={{ width: size, height: size }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: bg }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-white font-black">
          {status === "waiting" ? (
            <span className="text-white/25 text-2xl">⌛</span>
          ) : (
            <span className="text-lg">{initials(name)}</span>
          )}
        </div>
        <span
          className={`absolute top-1 right-1 size-3 rounded-full border border-background ${
            status === "ready" ? "bg-green-400" : "bg-white/10"
          }`}
        />
      </div>
      <div className="text-[11px] font-bold text-white/70">{name}</div>
    </div>
  );
}
