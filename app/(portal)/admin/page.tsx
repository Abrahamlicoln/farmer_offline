"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FarmerRecord } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { getActiveSession, AuthUser } from "@/lib/auth";

const PROGRAMME_COLORS = [
  "#15803d", // Emerald / Green
  "#0284c7", // Sky blue
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
];

import { db } from "@/lib/db";
import { syncAllLocalFarmers } from "@/lib/syncService";

export default function AdminPortalPage() {
  const router = useRouter();
  const [farmers, setFarmers] = useState<FarmerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedLga, setSelectedLga] = useState("");
  const [selectedVillage, setSelectedVillage] = useState("");
  const [selectedProgramme, setSelectedProgramme] = useState("");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const session = getActiveSession();
    if (session.user) {
      if (session.user.role !== "admin") {
        router.replace("/farmers");
        return;
      }
      setCurrentUser(session.user);
    } else {
      router.replace("/signin");
    }
  }, [router]);

  const fetchCentralRecords = async () => {
    setLoading(true);
    try {
      // 1. Sync any local IndexedDB farmers to Neon DB
      await syncAllLocalFarmers();

      // 2. Fetch all central records from Neon DB
      const res = await fetch("/api/farmers");
      const data = await res.json();
      let centralList: FarmerRecord[] = [];
      if (data.success && Array.isArray(data.farmers)) {
        centralList = data.farmers;
      }

      // 3. Read local Dexie records and merge so registered farmers always show
      const localRecords = await db.farmers.toArray();
      const map = new Map<string, FarmerRecord>();
      centralList.forEach((f) => map.set(f.id, f));
      localRecords.forEach((f) => {
        if (!map.has(f.id)) {
          map.set(f.id, f);
        }
      });

      setFarmers(Array.from(map.values()));
    } catch (err) {
      console.error("[Admin] Error fetching records:", err);
      try {
        const localRecords = await db.farmers.toArray();
        setFarmers(localRecords);
      } catch {
        toast.error("Failed to load records.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCentralRecords();
  }, []);

  // Filtered farmers list based on all active criteria
  const filteredFarmers = useMemo(() => {
    return farmers.filter((farmer) => {
      if (selectedState && farmer.stateName !== selectedState) return false;
      if (selectedLga && farmer.lgaName !== selectedLga) return false;
      if (selectedVillage && farmer.village !== selectedVillage) return false;
      if (selectedProgramme && farmer.programme !== selectedProgramme) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          farmer.fullName.toLowerCase().includes(q) ||
          farmer.phoneNumber.includes(q) ||
          farmer.id.toLowerCase().includes(q) ||
          farmer.village.toLowerCase().includes(q) ||
          farmer.lgaName.toLowerCase().includes(q) ||
          (farmer.registeredBy && farmer.registeredBy.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [farmers, selectedState, selectedLga, selectedVillage, selectedProgramme, search]);

  // Unique lists for filtering dropdowns
  const uniqueStates = useMemo(() => {
    return Array.from(new Set(farmers.map((f) => f.stateName).filter(Boolean))).sort();
  }, [farmers]);

  const availableLgas = useMemo(() => {
    const list = selectedState
      ? farmers.filter((f) => f.stateName === selectedState)
      : farmers;
    return Array.from(new Set(list.map((f) => f.lgaName).filter(Boolean))).sort();
  }, [farmers, selectedState]);

  const availableVillages = useMemo(() => {
    let list = farmers;
    if (selectedState) {
      list = list.filter((f) => f.stateName === selectedState);
    }
    if (selectedLga) {
      list = list.filter((f) => f.lgaName === selectedLga);
    }
    return Array.from(new Set(list.map((f) => f.village).filter(Boolean))).sort();
  }, [farmers, selectedState, selectedLga]);

  const uniqueProgrammes = useMemo(() => {
    return Array.from(new Set(farmers.map((f) => f.programme).filter(Boolean))).sort();
  }, [farmers]);

  // Options formatted for SearchableSelectField
  const stateOptions = useMemo(() => {
    return [
      { value: "", label: `All States (${uniqueStates.length})` },
      ...uniqueStates.map((st) => ({ value: st, label: st })),
    ];
  }, [uniqueStates]);

  const lgaOptions = useMemo(() => {
    return [
      {
        value: "",
        label: selectedState
          ? `All LGAs in ${selectedState} (${availableLgas.length})`
          : `All LGAs (${availableLgas.length})`,
      },
      ...availableLgas.map((lg) => ({ value: lg, label: lg })),
    ];
  }, [availableLgas, selectedState]);

  const villageOptions = useMemo(() => {
    return [
      {
        value: "",
        label: selectedLga
          ? `All Villages in ${selectedLga} (${availableVillages.length})`
          : `All Villages (${availableVillages.length})`,
      },
      ...availableVillages.map((v) => ({ value: v, label: v })),
    ];
  }, [availableVillages, selectedLga]);

  const programmeOptions = useMemo(() => {
    return [
      { value: "", label: `All Programmes (${uniqueProgrammes.length})` },
      ...uniqueProgrammes.map((pr) => ({ value: pr, label: pr })),
    ];
  }, [uniqueProgrammes]);

  // Dynamic Geographic BarChart (Filters by State -> LGA -> Village)
  const { geoChartData, geoChartTitle, geoChartSubtitle } = useMemo(() => {
    if (selectedLga) {
      // Group by Village / Community
      const counts: Record<string, number> = {};
      filteredFarmers.forEach((f) => {
        const v = f.village || "Unknown";
        counts[v] = (counts[v] || 0) + 1;
      });
      return {
        geoChartTitle: `Registrations by Village (${selectedLga})`,
        geoChartSubtitle: `Farmer count per village/community in ${selectedLga}, ${selectedState}`,
        geoChartData: Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 15),
      };
    }

    if (selectedState) {
      // Group by LGA
      const counts: Record<string, number> = {};
      filteredFarmers.forEach((f) => {
        const l = f.lgaName || "Unknown";
        counts[l] = (counts[l] || 0) + 1;
      });
      return {
        geoChartTitle: `Registrations by LGA (${selectedState})`,
        geoChartSubtitle: `Farmer count per LGA in ${selectedState}`,
        geoChartData: Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 15),
      };
    }

    // Default: Group by State
    const counts: Record<string, number> = {};
    filteredFarmers.forEach((f) => {
      const s = f.stateName || "Unknown";
      counts[s] = (counts[s] || 0) + 1;
    });
    return {
      geoChartTitle: "Registrations by State",
      geoChartSubtitle: "Farmer distribution across Nigerian States",
      geoChartData: Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15),
    };
  }, [filteredFarmers, selectedState, selectedLga]);

  // Programme Distribution Data for PieChart (recalculates from filtered records)
  const programmeChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredFarmers.forEach((f) => {
      const p = f.programme || "Other";
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredFarmers]);

  // CSV Export
  const exportToCSV = () => {
    if (filteredFarmers.length === 0) {
      toast.error("No records to export");
      return;
    }

    const headers = [
      "Farmer ID",
      "Full Name",
      "Phone Number",
      "State",
      "LGA",
      "Village",
      "Programme",
      "Registered By",
      "Date Registered",
    ];

    const rows = filteredFarmers.map((f) => [
      f.id,
      `"${f.fullName.replace(/"/g, '""')}"`,
      `="${f.phoneNumber}"`,
      `"${f.stateName}"`,
      `"${f.lgaName}"`,
      `"${f.village.replace(/"/g, '""')}"`,
      `"${f.programme}"`,
      `"${f.registeredBy}"`,
      `"${f.createdAt}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `OAF_Nigeria_Farmers_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredFarmers.length} farmers to CSV!`);
  };

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedLga("");
    setSelectedVillage("");
  };

  const handleLgaChange = (lga: string) => {
    setSelectedLga(lga);
    setSelectedVillage("");
  };

  const clearAllFilters = () => {
    setSearch("");
    setSelectedState("");
    setSelectedLga("");
    setSelectedVillage("");
    setSelectedProgramme("");
  };

  const hasActiveFilters = Boolean(
    search || selectedState || selectedLga || selectedVillage || selectedProgramme
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 font-sans">
      <AppHeader
        title="Admin Portal"
        subtitle="Master registry and agricultural analytics across all States"
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI StatCards strictly matching pmtool StatCard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Farmers"
            value={loading ? "..." : filteredFarmers.length}
            variant="emerald"
            icon={
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            }
          />

          <StatCard
            label="Active States"
            value={loading ? "..." : uniqueStates.length}
            variant="purple"
            icon={
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />

          <StatCard
            label="Active LGAs"
            value={loading ? "..." : availableLgas.length}
            variant="amber"
            icon={
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />

          <StatCard
            label="Active Villages"
            value={loading ? "..." : availableVillages.length}
            variant="sky"
            icon={
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            }
          />
        </div>

        {/* Dynamic Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dynamic Geographic Distribution Chart */}
          <Card className="lg:col-span-2 border border-gray-200/90 shadow-none bg-white rounded-md">
            <CardHeader className="border-b border-gray-200/80 py-4 px-6">
              <CardTitle className="text-base font-semibold text-[#0E121B]">
                {geoChartTitle}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {geoChartSubtitle}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : geoChartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                  No records found for this filter selection
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={geoChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="count" fill="#15803d" radius={[4, 4, 0, 0]} name="Farmers" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Programme Distribution Chart */}
          <Card className="border border-gray-200/90 shadow-none bg-white rounded-md">
            <CardHeader className="border-b border-gray-200/80 py-4 px-6">
              <CardTitle className="text-base font-semibold text-[#0E121B]">
                Programme Breakdown
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Enrollment across packages for current selection
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : programmeChartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                  No records to chart
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={programmeChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {programmeChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PROGRAMME_COLORS[index % PROGRAMME_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Bar: State -> LGA -> Village -> Programme */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="w-full sm:w-56">
              <InputField
                placeholder="Search name, phone, officer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>

            {/* Filter: State */}
            <div className="w-full sm:w-44">
              <SearchableSelectField
                value={selectedState}
                onValueChange={handleStateChange}
                options={stateOptions}
                placeholder="All States"
                searchPlaceholder="Search states..."
                triggerClassName="h-11 px-3 text-xs font-medium text-[#0E121B]"
                clearable
              />
            </div>

            {/* Filter: LGA (Dynamic based on selected State) */}
            <div className="w-full sm:w-44">
              <SearchableSelectField
                value={selectedLga}
                onValueChange={handleLgaChange}
                options={lgaOptions}
                placeholder={selectedState ? "All LGAs" : "All LGAs"}
                searchPlaceholder="Search LGAs..."
                triggerClassName="h-11 px-3 text-xs font-medium text-[#0E121B]"
                clearable
              />
            </div>

            {/* Filter: Village / Community (Dynamic based on LGA/State) */}
            <div className="w-full sm:w-48">
              <SearchableSelectField
                value={selectedVillage}
                onValueChange={setSelectedVillage}
                options={villageOptions}
                placeholder={selectedLga ? "All Villages" : "All Villages"}
                searchPlaceholder="Search villages..."
                triggerClassName="h-11 px-3 text-xs font-medium text-[#0E121B]"
                clearable
              />
            </div>

            {/* Filter: Programme */}
            <div className="w-full sm:w-48">
              <SearchableSelectField
                value={selectedProgramme}
                onValueChange={setSelectedProgramme}
                options={programmeOptions}
                placeholder="All Programmes"
                searchPlaceholder="Search programmes..."
                triggerClassName="h-11 px-3 text-xs font-medium text-[#0E121B]"
                clearable
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 ml-1 cursor-pointer whitespace-nowrap"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCentralRecords}
              className="h-11 px-3 text-xs font-medium rounded-md gap-1.5"
            >
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </Button>

            <Button
              variant="brand"
              size="sm"
              onClick={exportToCSV}
              className="h-11 px-4 text-xs font-medium rounded-md gap-2 bg-emerald-700 hover:bg-emerald-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Database Table Card matching pmtool table */}
        <Card className="rounded-md border border-gray-200/90 shadow-none bg-white overflow-hidden">
          <CardHeader className="border-b border-gray-200/80 py-4 px-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[#0E121B]">
                Master Farmer Records
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Showing {filteredFarmers.length} of {farmers.length} total registered records
              </CardDescription>
            </div>
            <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100">
              Admin Access
            </span>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredFarmers.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xl mb-3">
                  🌾
                </div>
                <h4 className="text-sm font-semibold text-[#0E121B]">No Farmers Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  {hasActiveFilters
                    ? "No records match your selected filter criteria. Try clearing filters."
                    : "No farmers currently recorded in registry."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-150 overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-[#F5F7FA] shadow-xs">
                    <TableRow>
                      <TableHead>Farmer ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Location (LGA, State)</TableHead>
                      <TableHead>Village</TableHead>
                      <TableHead>Programme</TableHead>
                      <TableHead>Officer</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFarmers.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="text-xs font-semibold text-emerald-800">
                          {f.id}
                        </TableCell>

                        <TableCell className="font-semibold text-[#0E121B]">
                          {f.fullName}
                        </TableCell>

                        <TableCell className="text-xs text-slate-700 font-normal">
                          {f.phoneNumber}
                        </TableCell>

                        <TableCell>
                          <div className="font-medium text-[#0E121B] text-xs">
                            {f.lgaName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {f.stateName}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-medium text-[#0E121B] text-xs">
                            {f.village}
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="inline-block text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100">
                            {f.programme}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs text-slate-600">
                          {f.registeredBy || "Field Officer"}
                        </TableCell>

                        <TableCell>
                          <StatusBadge status="synced" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
