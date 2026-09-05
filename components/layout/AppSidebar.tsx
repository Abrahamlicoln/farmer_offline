"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useNetwork } from "@/context/NetworkContext";
import { useSidebar } from "@/context/SidebarContext";
import { getActiveSession, clearAuthSession, AuthUser } from "@/lib/auth";
import { toast } from "sonner";

export function VerifiedBadgeIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-4 h-4 rounded-full bg-[#38BDF8] flex items-center justify-center text-white shrink-0 shadow-2xs",
        className
      )}
    >
      <svg
        width="9"
        height="9"
        viewBox="0 0 10 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8.33332 2.5L3.74998 7.08333L1.66665 5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export const AppSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { pendingCount } = useNetwork();
  const { mobileOpen, setMobileOpen, collapsed, setCollapsed } = useSidebar();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const session = getActiveSession();
    if (session.user) {
      setCurrentUser(session.user);
    }
  }, []);

  const handleSignOut = () => {
    clearAuthSession();
    toast.info("Signed out. Local session token cleared.");
    router.push("/signin");
  };

  const getInitials = (n: string) => {
    return n
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

    const isAdmin = currentUser?.role === "admin";

  const navItems = [
    {
      label: "Register Farmer",
      href: "/register",
      badge: null,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
      ),
    },
    {
      label: "Field Records",
      href: "/farmers",
      badge: pendingCount > 0 ? `${pendingCount}` : null,
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
    },
    ...(isAdmin
      ? [
          {
            label: "Admin Portal",
            href: "/admin",
            badge: null,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            ),
          },
          {
            label: "Sync Audit Logs",
            href: "/sync-logs",
            badge: null,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "flex flex-col h-screen shrink-0 border-r border-slate-200/80 bg-white transition-all duration-300 ease-in-out font-sans select-none relative",
          // Desktop sizing
          "lg:static lg:translate-x-0",
          collapsed ? "lg:w-[72px]" : "lg:w-[264px]",
          // Mobile drawer
          "fixed top-0 left-0 z-50 w-[264px] lg:relative lg:z-auto",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header with App Logo & Organization Switcher */}
        <div className="px-4 py-4 border-b border-slate-100/80">
          <div className="flex items-center justify-between gap-2">
            {!collapsed ? (
              <div className="flex items-center justify-between min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src="/logo.png"
                    alt="One Acre Fund"
                    className="h-8 w-auto max-w-[140px] object-contain shrink-0"
                  />
                </div>
                <button
                  type="button"
                  className="p-1.5 rounded-lg border border-slate-200/80 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer shrink-0 ml-1"
                  aria-label="Switch organization"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="mx-auto flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="One Acre Fund"
                  className="h-6 w-auto object-contain"
                />
              </div>
            )}

            {/* Mobile close button */}
            <button
              type="button"
              className="lg:hidden ml-auto p-1 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sidebar Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          <div>
            {!collapsed && (
              <h3 className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                MAIN
              </h3>
            )}
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(`${item.href}/`));

                return (
                  <div key={item.label} className="relative group">
                    {/* Brand green active bar on left edge */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-700 rounded-r-full z-20"
                        aria-hidden="true"
                      />
                    )}

                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer",
                        isActive
                          ? "bg-emerald-50 text-slate-900 font-semibold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      <span
                        className={cn(
                          "shrink-0 transition-colors duration-200",
                          collapsed ? "mx-auto" : "",
                          isActive
                            ? "text-emerald-700"
                            : "text-slate-400 group-hover:text-slate-600"
                        )}
                      >
                        {item.icon}
                      </span>

                      {!collapsed && (
                        <span className="truncate flex-1 text-[14px] leading-tight">
                          {item.label}
                        </span>
                      )}

                      {!collapsed && item.badge && (
                        <span
                          className={cn(
                            "shrink-0 px-2 py-0.5 border rounded-md text-[11px] font-medium shadow-2xs",
                            item.badgeColor || "border-slate-200 text-slate-500 bg-white"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer User Profile Section (Matching pmtool SidebarFooter) */}
        <div className="border-t border-gray-200/90 pt-3 px-3 pb-3 mt-auto relative">
          {/* User profile dropdown box */}
          {showUserMenu && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-30 animate-in fade-in slide-in-from-bottom-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Log out</span>
              </button>
            </div>
          )}

          <div
            onClick={() => setShowUserMenu((prev) => !prev)}
            className={cn(
              "flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer select-none",
              collapsed && "justify-center p-1"
            )}
          >
            {/* User Avatar with Initials */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-[#FEF08A] border border-amber-200 flex items-center justify-center text-amber-900 font-bold text-xs shrink-0 overflow-hidden">
                {getInitials(currentUser?.fullName || "Field Officer")}
              </div>
            </div>

            {/* User Details */}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] leading-[20px] font-semibold text-[#0E121B] truncate">
                    {currentUser?.fullName || "Amina Bello"}
                  </span>
                  <VerifiedBadgeIcon className="w-4 h-4" />
                </div>
                <p className="text-[12px] leading-[16px] font-normal text-slate-500 truncate mt-0.5">
                  {currentUser?.role === "admin"
                    ? "Operations Admin"
                    : currentUser?.email || "officer.nigeria@oneacrefund.org"}
                </p>
              </div>
            )}

            {!collapsed && (
              <svg className="w-4 h-4 text-slate-400 shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        </div>

        {/* Desktop Collapse / Expand Toggle Button on right border edge */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center absolute -right-3 top-16 z-30 bg-white border border-slate-200 text-slate-400 hover:text-emerald-700 rounded-full p-1 shadow-md hover:shadow-lg transition-all cursor-pointer"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            )}
          </svg>
        </button>
      </aside>
    </>
  );
};
