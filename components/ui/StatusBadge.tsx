import React from "react";
import { cn } from "@/lib/utils";

export interface StatusBadgeProps {
  status?: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = (status || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/-/g, " ");

  let textColor = "text-slate-700";
  let circleBg = "bg-slate-500";
  let iconType = "clock";

  if (normalized.includes("pending") || normalized.includes("review") || normalized.includes("awaiting")) {
    textColor = "text-amber-700";
    circleBg = "bg-amber-500";
    iconType = "clock";
  } else if (normalized.includes("in progress")) {
    textColor = "text-blue-700";
    circleBg = "bg-blue-500";
    iconType = "clock";
  } else if (
    normalized.includes("approved") ||
    normalized.includes("completed") ||
    normalized.includes("active") ||
    normalized.includes("synced") ||
    normalized.includes("in use") ||
    normalized.includes("logged")
  ) {
    textColor = "text-emerald-700";
    circleBg = "bg-emerald-500";
    iconType = "check";
  } else if (
    normalized.includes("rejected") ||
    normalized.includes("suspended") ||
    normalized.includes("failed") ||
    normalized.includes("cancelled") ||
    normalized.includes("declined") ||
    normalized.includes("ended") ||
    normalized.includes("missed")
  ) {
    textColor = "text-rose-700";
    circleBg = "bg-rose-500";
    iconType = "cross";
  }

  const displayLabel = normalized
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-gray-300 bg-transparent tracking-tight select-none",
        textColor,
        className
      )}
    >
      <div
        className={cn(
          "w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0",
          circleBg
        )}
      >
        {iconType === "check" && (
          <svg
            width="8"
            height="6"
            viewBox="0 0 8 6"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 3L3 5L7 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {iconType === "clock" && (
          <svg
            width="8"
            height="8"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.2" />
            <path
              d="M6 3.5V6L7.5 7.5"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        )}
        {iconType === "cross" && (
          <svg
            width="7"
            height="7"
            viewBox="0 0 8 8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 1L7 7M7 1L1 7"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
      <span>{displayLabel}</span>
    </span>
  );
}

export default StatusBadge;
