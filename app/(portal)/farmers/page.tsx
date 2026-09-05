"use client";

import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useNetwork } from "@/context/NetworkContext";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/InputField";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableFilterTabs } from "@/components/ui/TableFilterTabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { SyncStatus, FarmerRecord } from "@/types";
import Link from "next/link";
import { toast } from "sonner";
import { getActiveSession, AuthUser } from "@/lib/auth";
import { syncAllLocalFarmers } from "@/lib/syncService";

export default function FieldRecordsPage() {
  const { isOnline, triggerSync, isSyncing } = useNetwork();
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const session = getActiveSession();
    if (session.user) {
      setCurrentUser(session.user);
    }
  }, []);

  const isOfficer = currentUser?.role === "officer";

  // Hydrate central records into local Dexie so Admin sees everybody and Officer sees all their records
  useEffect(() => {
    const hydrateAndSync = async () => {
      // 1. Push any local unsynced records to central DB
      await syncAllLocalFarmers();

      // 2. Pull central records from /api/farmers to hydrate Dexie
      try {
        const url = isOfficer && currentUser?.fullName
          ? `/api/farmers?officer=${encodeURIComponent(currentUser.fullName)}`
          : `/api/farmers`;

        const res = await fetch(url);
        const data = await res.json();
        if (data.success && Array.isArray(data.farmers) && data.farmers.length > 0) {
          await db.transaction("rw", db.farmers, async () => {
            for (const f of data.farmers) {
              const existing = await db.farmers.get(f.id);
              if (!existing) {
                await db.farmers.add({
                  ...f,
                  syncStatus: "synced",
                });
              } else if (existing.syncStatus === "synced") {
                await db.farmers.update(f.id, {
                  ...f,
                  syncStatus: "synced",
                });
              }
            }
          });
        }
      } catch (err) {
        console.warn("[Farmers] Error hydrating records from central:", err);
      }
    };

    if (currentUser) {
      hydrateAndSync();
    }
  }, [currentUser, isOfficer]);

  // Live Dexie reactive queries
  const allDexieFarmers = useLiveQuery(
    () => db.farmers.orderBy("createdAt").reverse().toArray(),
    [],
    []
  );

  // Scope records: Field officers only see their own records; Admins see all records nationwide
  const scopedFarmers = (allDexieFarmers || []).filter((farmer) => {
    if (!currentUser) return true;
    if (isOfficer) {
      // Officer sees records created by their own identity
      const officerName = (currentUser.fullName || "").toLowerCase();
      const officerEmail = (currentUser.email || "").toLowerCase();
      const regBy = (farmer.registeredBy || "").toLowerCase();

      return (
        regBy.includes(officerName) ||
        regBy.includes(officerEmail) ||
        regBy === "field officer" ||
        regBy.includes("amina") ||
        regBy === ""
      );
    }
    // Admin sees everything
    return true;
  });

  // Filtered farmers based on status and search query
  const filteredFarmers = scopedFarmers.filter((farmer) => {
    // Status filter
    if (filterStatus !== "ALL" && farmer.syncStatus !== filterStatus) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        farmer.fullName.toLowerCase().includes(q) ||
        farmer.phoneNumber.includes(q) ||
        farmer.id.toLowerCase().includes(q) ||
        farmer.village.toLowerCase().includes(q) ||
        farmer.lgaName.toLowerCase().includes(q) ||
        farmer.programme.toLowerCase().includes(q)
      );
    }

    return true;
  });

  // KPI Status Counts
  const totalCount = scopedFarmers.length;
  const pendingCount = scopedFarmers.filter((f) => f.syncStatus === "pending").length;
  const syncedCount = scopedFarmers.filter((f) => f.syncStatus === "synced").length;
  const failedCount = scopedFarmers.filter((f) => f.syncStatus === "failed").length;

  // Status Filter Options for TableFilterTabs
  const filterTabs = [
    { id: "ALL", label: `All (${totalCount})` },
    { id: "pending", label: `Pending (${pendingCount})` },
    { id: "synced", label: `Synced (${syncedCount})` },
    { id: "failed", label: `Failed (${failedCount})` },
  ];

  // Single record retry
  const handleRetry = async (farmer: FarmerRecord) => {
    if (!isOnline) {
      toast.error(
        "Cannot sync while offline. Please turn off simulated offline or connect to network."
      );
      return;
    }
    await triggerSync();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 font-sans">
      <AppHeader
        title="Field Records"
        subtitle="Manage and view smallholder farmer registration records"
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Stat Cards strictly matching pmtool StatCard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Registered"
            value={totalCount}
            variant="purple"
            icon={
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />

          <StatCard
            label="Pending Sync"
            value={pendingCount}
            variant="amber"
            icon={
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <StatCard
            label="Synced"
            value={syncedCount}
            variant="emerald"
            icon={
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <StatCard
            label="Failed Sync"
            value={failedCount}
            variant="red"
            icon={
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
        </div>

        {/* Action and Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Status Tabs matching pmtool TableFilterTabs */}
          <TableFilterTabs
            options={filterTabs}
            activeTab={filterStatus}
            onTabChange={(id) => setFilterStatus(id)}
          />

          {/* Search bar & Register CTA */}
          <div className="flex items-center gap-2.5">
            <div className="w-full sm:w-64">
              <InputField
                placeholder="Search name, phone, village..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>

            <Link href="/register">
              <Button size="default" variant="brand" className="whitespace-nowrap font-medium">
                + New Farmer
              </Button>
            </Link>
          </div>
        </div>

        {/* Records Table matching pmtool table.tsx */}
        {filteredFarmers.length === 0 ? (
          <div className="rounded-md border border-gray-200/90 bg-white p-12 text-center flex flex-col items-center justify-center shadow-none">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xl mb-3">
              🌾
            </div>
            <h4 className="text-sm font-semibold text-[#0E121B]">
              No Farmer Records Found
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
              {searchQuery
                ? "No farmers match your search terms. Try clearing the filter."
                : isOfficer
                ? "You haven't recorded any farmers yet. Begin registering farmers now."
                : "No farmer records found in this category."}
            </p>
            <Link href="/register">
              <Button variant="brand" size="sm">
                Register First Farmer
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-150 overflow-y-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[#F5F7FA] shadow-xs">
              <TableRow>
                <TableHead>Farmer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location (LGA & Village)</TableHead>
                <TableHead>Programme</TableHead>
                {!isOfficer && <TableHead>Officer</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFarmers.map((farmer) => {
                const isPending = farmer.syncStatus === "pending";
                const isSynced = farmer.syncStatus === "synced";
                const isFailed = farmer.syncStatus === "failed";

                return (
                  <TableRow key={farmer.id}>
                    <TableCell>
                      <div className="font-semibold text-[#0E121B]">
                        {farmer.fullName}
                      </div>
                      <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                        {farmer.id}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-700 font-normal">
                      {farmer.phoneNumber}
                    </TableCell>

                    <TableCell>
                      <div className="font-medium text-[#0E121B] text-xs">
                        {farmer.village}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {farmer.lgaName}, {farmer.stateName}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="inline-block text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100">
                        {farmer.programme}
                      </span>
                    </TableCell>

                    {!isOfficer && (
                      <TableCell className="text-xs text-slate-600">
                        {farmer.registeredBy || "Field Officer"}
                      </TableCell>
                    )}

                    <TableCell>
                      {/* Status Badge replicating pmtool AlignUITable StatusBadge */}
                      <StatusBadge status={farmer.syncStatus} />
                    </TableCell>

                    <TableCell className="text-right">
                      {isPending && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(farmer)}
                          disabled={!isOnline || isSyncing}
                          className="h-8 text-xs font-medium border-amber-300 text-amber-800 hover:bg-amber-50"
                        >
                          Sync
                        </Button>
                      )}

                      {isFailed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(farmer)}
                          disabled={!isOnline || isSyncing}
                          className="h-8 text-xs font-medium border-rose-300 text-rose-800 hover:bg-rose-50"
                        >
                          Retry
                        </Button>
                      )}

                      {isSynced && (
                        <span className="text-xs text-emerald-600 font-medium">
                          Synced
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  </div>
  );
}
