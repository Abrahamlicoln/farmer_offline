"use client";

import React, { useState, useEffect } from "react";
import { useNetwork } from "@/context/NetworkContext";
import { useSidebar } from "@/context/SidebarContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getActiveSession, AuthUser } from "@/lib/auth";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title, subtitle }) => {
  const {
    isOnline,
    simulatedOffline,
    toggleSimulatedOffline,
    isSyncing,
    triggerSync,
    pendingCount,
  } = useNetwork();
  const { toggleMobile } = useSidebar();
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setCurrentDateTime(new Date());
    const intervalId = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const session = getActiveSession();
    if (session.user) {
      setCurrentUser(session.user);
    }
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <header className="bg-white border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between shadow-none select-none sticky top-0 z-30 font-sans">
      {/* Left side: Hamburger & Title or Date/Time (matching pmtool AppHeader) */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={toggleMobile}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden shrink-0 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {title ? (
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-[#0E121B] leading-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-slate-500 hidden sm:block truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        ) : (
          /* Live Date & Time display matching pmtool exactly */
          currentDateTime && (
            <div className="hidden sm:flex items-center gap-3 text-sm text-slate-600 font-medium">
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.8" />
                  <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.8" />
                </svg>
                <span>{formatDate(currentDateTime)}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="1.8" />
                  <polyline points="12 6 12 12 16 14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{formatTime(currentDateTime)}</span>
              </div>
            </div>
          )
        )}
      </div>

      {/* Right side: Network Pill, Simulator Toggle, Sync Now */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Network status pill */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all select-none",
            isOnline
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : simulatedOffline
              ? "bg-amber-50 text-amber-800 border-amber-300"
              : "bg-rose-50 text-rose-800 border-rose-200"
          )}
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isOnline
                ? "bg-emerald-500 animate-pulse"
                : simulatedOffline
                ? "bg-amber-500"
                : "bg-rose-500"
            )}
          />
          <span className="hidden md:inline">
            {isOnline
              ? "Connected Online"
              : simulatedOffline
              ? "Simulated Offline"
              : "No Connection"}
          </span>
          <span className="md:hidden">
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>

        {/* Offline / Online simulator switch */}
        <button
          type="button"
          onClick={toggleSimulatedOffline}
          title={
            simulatedOffline
              ? "Switch to Online Mode"
              : "Simulate No Internet (Offline Mode)"
          }
          className={cn(
            "h-9 px-3 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer shadow-none",
            simulatedOffline
              ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600"
              : "bg-white text-slate-700 border-gray-200 hover:bg-slate-50"
          )}
        >
          {simulatedOffline ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Go Online</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656m-7.072 0a4 4 0 000 5.656m-3.536 3.536a9 9 0 010-12.728M12 12h.01" />
              </svg>
              <span className="hidden sm:inline">Simulate Offline</span>
              <span className="sm:hidden">Simulate</span>
            </>
          )}
        </button>

        {/* Sync Now Button */}
        <Button
          size="sm"
          variant="brand"
          onClick={() => triggerSync()}
          disabled={!isOnline || isSyncing}
          className="h-9 px-3.5 text-xs font-medium gap-1.5 rounded-md"
        >
          <svg
            className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="hidden sm:inline">
            {isSyncing ? "Syncing..." : pendingCount > 0 ? `Sync (${pendingCount})` : "Sync Cloud"}
          </span>
          <span className="sm:hidden">{isSyncing ? "..." : "Sync"}</span>
        </Button>
      </div>
    </header>
  );
};
