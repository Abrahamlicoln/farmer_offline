"use client";

import React from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider } from "@/context/SidebarContext";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-white">
        {/* Responsive Sidebar */}
        <AppSidebar />

        {/* Main Content Area with smooth vertical scrolling */}
        <div className="flex flex-col flex-1 min-w-0 overflow-y-auto h-full relative">
          <div className="relative z-10 flex flex-col flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
