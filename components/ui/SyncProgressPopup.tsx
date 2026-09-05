"use client";

import React, { useEffect, useState } from "react";
import { syncEventBus, SyncEventPayload } from "@/lib/firebase";
import { cn } from "@/lib/utils";

export const SyncProgressPopup: React.FC = () => {
  const [event, setEvent] = useState<SyncEventPayload | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = syncEventBus.subscribe((payload) => {
      setEvent(payload);
      setVisible(true);

      // Auto-dismiss on success after 5 seconds
      if (payload.status === "success") {
        const timer = setTimeout(() => {
          setVisible(false);
        }, 5000);
        return () => clearTimeout(timer);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!visible || !event) return null;

  const percentage =
    event.total && event.total > 0
      ? Math.min(100, Math.round(((event.current ?? 0) / event.total) * 100))
      : 0;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl p-4.5 text-slate-900 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {event.status === "syncing" ? (
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <svg
                  className="animate-spin w-4 h-4 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            ) : event.status === "success" ? (
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            )}

            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 truncate">
                {event.status === "syncing"
                  ? "Syncing Online..."
                  : event.status === "success"
                  ? "Sync Completed"
                  : "Sync Notice"}
              </h4>
              <p className="text-xs text-slate-500 truncate">
                {event.message || "Transferring records to central system"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setVisible(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Progress bar during syncing */}
        {event.status === "syncing" && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>Progress</span>
              <span>{percentage}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Summary badge on success */}
        {event.status === "success" && (
          <div className="flex items-center gap-2 pt-1 text-xs text-emerald-800 bg-emerald-50/70 px-3 py-1.5 rounded-lg border border-emerald-100">
            <span className="font-semibold">{event.syncedCount ?? 0}</span> records synced
            {event.duplicateCount && event.duplicateCount > 0 ? (
              <span className="text-slate-500">({event.duplicateCount} duplicates safe)</span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
