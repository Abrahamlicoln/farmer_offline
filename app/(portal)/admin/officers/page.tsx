"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InputField } from "@/components/ui/InputField";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { getActiveSession, AuthUser, saveDynamicOfflineAccount } from "@/lib/auth";
import { NIGERIA_STATES } from "@/data/locations-seed";
import { db } from "@/lib/db";

interface OfficerFarmer {
  id: string;
  fullName: string;
  phoneNumber: string;
  stateCode?: string;
  stateName?: string;
  lgaName?: string;
  village?: string;
  programme?: string;
  registeredBy?: string;
  syncStatus?: string;
  createdAt?: string;
}

interface OfficerRecord {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
  farmerCount: number;
  farmers: OfficerFarmer[];
}

export default function RegisterOfficerPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password123!");
  const [role, setRole] = useState<"officer" | "admin">("officer");
  const [assignedState, setAssignedState] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Success state
  const [lastCreatedOfficer, setLastCreatedOfficer] = useState<{
    fullName: string;
    email: string;
    password: string;
    role: string;
  } | null>(null);

  // Officers & Farmers states
  const [officers, setOfficers] = useState<OfficerRecord[]>([]);
  const [loadingOfficers, setLoadingOfficers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal / Drawer state for viewing an officer's registered farmers
  const [selectedOfficerForFarmers, setSelectedOfficerForFarmers] = useState<OfficerRecord | null>(null);
  const [farmerFilterQuery, setFarmerFilterQuery] = useState("");
  const [expandedOfficerId, setExpandedOfficerId] = useState<string | null>(null);

  // Check admin authorization
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

  // Fetch officers with farmer counts and records (merging central + local Dexie)
  const fetchOfficers = async () => {
    setLoadingOfficers(true);
    try {
      const [res, localFarmers] = await Promise.all([
        fetch("/api/admin/officers")
          .then((r) => r.json())
          .catch(() => ({ success: false, officers: [] })),
        db.farmers.toArray().catch(() => []),
      ]);

      if (res.success && Array.isArray(res.officers)) {
        const mergedOfficers: OfficerRecord[] = res.officers.map((officer: any) => {
          const officerFullLower = officer.fullName.toLowerCase();
          const officerBaseLower = officer.fullName.replace(/\s*\([^)]*\)/g, "").trim().toLowerCase();
          const officerEmailLower = officer.email.toLowerCase();

          // Server-side farmers
          const serverFarmers: OfficerFarmer[] = Array.isArray(officer.farmers) ? officer.farmers : [];

          // Local Dexie matching farmers
          const matchingLocalFarmers = localFarmers.filter((f) => {
            const reg = (f.registeredBy || "").toLowerCase().trim();
            if (!reg) return false;
            return (
              reg === officerFullLower ||
              reg === officerBaseLower ||
              reg.includes(officerBaseLower) ||
              officerFullLower.includes(reg) ||
              (officer.email && reg.includes(officerEmailLower))
            );
          });

          // Merge by unique id
          const farmerMap = new Map<string, OfficerFarmer>();
          serverFarmers.forEach((f) => farmerMap.set(f.id, f));
          matchingLocalFarmers.forEach((f) => {
            if (!farmerMap.has(f.id)) {
              farmerMap.set(f.id, {
                id: f.id,
                fullName: f.fullName,
                phoneNumber: f.phoneNumber,
                stateCode: f.stateCode,
                stateName: f.stateName,
                lgaName: f.lgaName,
                village: f.village,
                programme: f.programme,
                registeredBy: f.registeredBy,
                syncStatus: f.syncStatus,
                createdAt: f.createdAt,
              });
            }
          });

          const combinedFarmers = Array.from(farmerMap.values());

          return {
            id: officer.id,
            fullName: officer.fullName,
            email: officer.email,
            role: officer.role,
            createdAt: officer.createdAt,
            farmerCount: combinedFarmers.length,
            farmers: combinedFarmers,
          };
        });

        setOfficers(mergedOfficers);

        // Also update modal selection if currently open
        setSelectedOfficerForFarmers((prev) => {
          if (!prev) return null;
          return mergedOfficers.find((o) => o.id === prev.id) || null;
        });
      }
    } catch (err) {
      console.error("[OfficersPage] Error loading officers:", err);
    } finally {
      setLoadingOfficers(false);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, []);

  // State dropdown options
  const stateOptions = useMemo(() => {
    return [
      { value: "", label: "National / Multi-State" },
      ...NIGERIA_STATES.map((s) => ({
        value: s.name,
        label: s.name,
      })),
    ];
  }, []);

  // Role dropdown options
  const roleOptions = useMemo(() => {
    return [
      { value: "officer", label: "Field Officer (Mobile Enumerator)" },
      { value: "admin", label: "Operations Admin (Full Access)" },
    ];
  }, []);

  // Filtered officers list
  const filteredOfficers = useMemo(() => {
    if (!searchQuery.trim()) return officers;
    const q = searchQuery.toLowerCase();
    return officers.filter(
      (o) =>
        o.fullName.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.role.toLowerCase().includes(q)
    );
  }, [officers, searchQuery]);

  // Filtered farmers inside the inspection modal
  const modalFarmersList = useMemo(() => {
    if (!selectedOfficerForFarmers) return [];
    const list = selectedOfficerForFarmers.farmers || [];
    if (!farmerFilterQuery.trim()) return list;
    const q = farmerFilterQuery.toLowerCase();
    return list.filter(
      (f) =>
        f.fullName.toLowerCase().includes(q) ||
        f.phoneNumber.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q) ||
        (f.village && f.village.toLowerCase().includes(q)) ||
        (f.lgaName && f.lgaName.toLowerCase().includes(q)) ||
        (f.programme && f.programme.toLowerCase().includes(q))
    );
  }, [selectedOfficerForFarmers, farmerFilterQuery]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanName) {
      setFormError("Officer full name is required.");
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setFormError("Please provide a valid email address.");
      return;
    }

    if (cleanPassword.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedName = assignedState
        ? `${cleanName} (${assignedState})`
        : cleanName;

      const res = await fetch("/api/admin/officers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formattedName,
          email: cleanEmail,
          password: cleanPassword,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to register field officer.");
      }

      // Cache for offline authentication
      saveDynamicOfflineAccount(cleanEmail, cleanPassword, {
        id: data.officer?.id || `usr-${Date.now()}`,
        email: cleanEmail,
        fullName: formattedName,
        role,
      });

      // Show success
      setLastCreatedOfficer({
        fullName: formattedName,
        email: cleanEmail,
        password: cleanPassword,
        role,
      });

      toast.success("Field officer registered successfully!");

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });

      // Reset fields
      setFullName("");
      setEmail("");
      setAssignedState("");
      setPassword("Password123!");
      setRole("officer");

      // Refresh list
      fetchOfficers();
    } catch (err: any) {
      setFormError(err.message || "Network error registering officer.");
      toast.error(err.message || "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy credentials helper
  const copyCredentials = () => {
    if (!lastCreatedOfficer) return;
    const credText = `One Acre Fund Officer Login\nEmail: ${lastCreatedOfficer.email}\nPassword: ${lastCreatedOfficer.password}\nRole: ${lastCreatedOfficer.role}`;
    navigator.clipboard.writeText(credText);
    toast.success("Credentials copied to clipboard!");
  };

  // Delete officer helper
  const handleDeleteOfficer = async (id: string, name: string) => {
    if (currentUser && currentUser.id === id) {
      toast.error("You cannot delete your own active administrator account.");
      return;
    }

    if (!confirm(`Are you sure you want to delete account for "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/officers?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Officer account for ${name} removed.`);
        fetchOfficers();
      } else {
        toast.error(data.message || "Failed to delete officer.");
      }
    } catch {
      toast.error("Error deleting officer account.");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 font-sans">
      <AppHeader
        title="Field Officers"
        subtitle="Register new field officers and view their registered farmer records"
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
        {/* Success Confirmation Banner */}
        {lastCreatedOfficer && (
          <div className="p-4 sm:p-5 rounded-md bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-none animate-in fade-in duration-200">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-950">
                  Officer Account Created Successfully!
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  <span className="font-semibold">{lastCreatedOfficer.fullName}</span> &bull; {lastCreatedOfficer.email} &bull; Password: <span className="font-semibold text-emerald-950">{lastCreatedOfficer.password}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyCredentials}
                className="h-9 px-3 text-xs font-medium rounded-md gap-1.5 border-emerald-300 text-emerald-900 hover:bg-emerald-100/50"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy Credentials</span>
              </Button>
              <button
                type="button"
                onClick={() => setLastCreatedOfficer(null)}
                className="text-xs text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Officer Registration Form Card */}
        <Card className="rounded-md border border-gray-200/90 shadow-none bg-white">
          <CardHeader className="border-b border-gray-200/80 py-4 px-6">
            <CardTitle className="text-base font-semibold text-[#0E121B]">
              Register New Field Officer
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Provision a field enumerator or regional supervisor account for field registration
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {formError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
                  {formError}
                </div>
              )}

              {/* Row 1: Full Name & Official Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField
                  label="Officer Full Name"
                  placeholder="e.g. Amina Bello"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  requiredIndicator
                  icon={
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />

                <InputField
                  label="Official Email Address"
                  type="email"
                  placeholder="e.g. amina.bello@oneacrefund.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  requiredIndicator
                  icon={
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  }
                />
              </div>

              {/* Row 2: Role & Assigned State */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <SearchableSelectField
                  label="Role"
                  value={role}
                  onValueChange={(val) => setRole(val as "officer" | "admin")}
                  options={roleOptions}
                  placeholder="Select Role..."
                  searchPlaceholder="Search roles..."
                  requiredIndicator
                />

                <SearchableSelectField
                  label="Assigned Operational State (Optional)"
                  value={assignedState}
                  onValueChange={setAssignedState}
                  options={stateOptions}
                  placeholder="Select State or National..."
                  searchPlaceholder="Search states..."
                  clearable
                />
              </div>

              {/* Row 3: Initial Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField
                  label="Initial Login Password"
                  type="text"
                  placeholder="e.g. Password123!"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  requiredIndicator
                  helperText="Default: Password123! (Field officer can sign in immediately)"
                  icon={
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <Button
                  type="submit"
                  variant="brand"
                  disabled={isSubmitting}
                  className="h-11 px-6 font-medium text-xs bg-emerald-700 hover:bg-emerald-800 gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Registering Officer...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <span>Register Field Officer</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Field Officers & Registered Farmers Overview Card */}
        <Card className="rounded-md border border-gray-200/90 shadow-none bg-white overflow-hidden">
          <CardHeader className="border-b border-gray-200/80 py-4 px-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-[#0E121B]">
                Field Officers & Registered Farmers
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Track active field officers and view all farmers registered by each officer
              </CardDescription>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-full sm:w-56">
                <InputField
                  placeholder="Search name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  }
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchOfficers}
                className="h-11 px-3 text-xs font-medium rounded-md gap-1.5"
              >
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loadingOfficers ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredOfficers.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xl mb-3">
                  👥
                </div>
                <h4 className="text-sm font-semibold text-[#0E121B]">No Officers Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  {searchQuery
                    ? "No officers match your search criteria."
                    : "No field officers currently registered."}
                </p>
              </div>
            ) : (
              <div>
                {/* Mobile Cards View (< md) */}
                <div className="md:hidden divide-y divide-gray-100">
                  {filteredOfficers.map((officer) => {
                    const isAdm = officer.role === "admin";
                    const initials = officer.fullName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    const isExpanded = expandedOfficerId === officer.id;

                    return (
                      <div
                        key={officer.id}
                        className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-[#0E121B] text-sm truncate">
                                {officer.fullName}
                              </h4>
                              <p className="text-xs text-slate-500 truncate">
                                {officer.email}
                              </p>
                            </div>
                          </div>
                          <StatusBadge status="active" />
                        </div>

                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <span
                            className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded border ${
                              isAdm
                                ? "bg-purple-50 text-purple-800 border-purple-100"
                                : "bg-emerald-50 text-emerald-800 border-emerald-100"
                            }`}
                          >
                            {isAdm ? "Operations Admin" : "Field Officer"}
                          </span>
                          <span className="text-slate-400">&bull;</span>
                          <span className="text-slate-500 text-[11px]">
                            Added: {officer.createdAt ? new Date(officer.createdAt).toLocaleDateString("en-GB") : "—"}
                          </span>
                        </div>

                        {/* Farmers Registered Metric & Quick Open */}
                        <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-100">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOfficerForFarmers(officer)}
                            className="h-9 px-3 text-xs font-semibold rounded-md gap-1.5 text-emerald-900 border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100 flex-1 justify-center"
                          >
                            <span>👥</span>
                            <span>View Farmers ({officer.farmerCount})</span>
                          </Button>

                          <button
                            type="button"
                            onClick={() => setExpandedOfficerId(isExpanded ? null : officer.id)}
                            className="h-9 px-2 text-xs text-slate-600 hover:text-slate-900 border border-gray-200 rounded-md hover:bg-slate-50"
                            title={isExpanded ? "Collapse inline preview" : "Expand inline preview"}
                          >
                            <svg
                              className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteOfficer(officer.id, officer.fullName)}
                            className="h-9 px-2.5 text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer rounded-md border border-gray-200 hover:border-rose-200 hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>

                        {/* Inline Mobile Farmers Preview */}
                        {isExpanded && (
                          <div className="p-3 bg-slate-50 rounded-md border border-gray-200 space-y-2 mt-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                              <span>Registered Farmers ({officer.farmerCount})</span>
                              <button
                                type="button"
                                onClick={() => setSelectedOfficerForFarmers(officer)}
                                className="text-emerald-700 text-[11px] underline"
                              >
                                Full view
                              </button>
                            </div>
                            {officer.farmers.length === 0 ? (
                              <p className="text-xs text-slate-500 py-1">No farmers recorded yet.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {officer.farmers.slice(0, 5).map((f) => (
                                  <div key={f.id} className="p-2 bg-white rounded border border-gray-100 text-xs">
                                    <div className="font-semibold text-[#0E121B]">{f.fullName}</div>
                                    <div className="text-[11px] text-slate-500">{f.village || "—"}, {f.lgaName || "—"}</div>
                                  </div>
                                ))}
                                {officer.farmers.length > 5 && (
                                  <p className="text-[11px] text-slate-500 text-center pt-1">
                                    +{officer.farmers.length - 5} more farmers...
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Structured Table (>= md) */}
                <div className="hidden md:block overflow-x-auto max-h-150 overflow-y-auto scrollbar-thin">
                  <Table className="min-w-[700px]">
                    <TableHeader className="sticky top-0 z-10 bg-[#F5F7FA] shadow-xs">
                      <TableRow>
                        <TableHead>Officer</TableHead>
                        <TableHead>Email / Username</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-center">Farmers Registered</TableHead>
                        <TableHead>Date Added</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOfficers.map((officer) => {
                        const isAdm = officer.role === "admin";
                        const initials = officer.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2);
                        const isExpanded = expandedOfficerId === officer.id;

                        return (
                          <React.Fragment key={officer.id}>
                            <TableRow className={isExpanded ? "bg-slate-50/70" : ""}>
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center shrink-0">
                                    {initials}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-[#0E121B] text-xs">
                                      {officer.fullName}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="text-xs text-slate-700 font-normal">
                                {officer.email}
                              </TableCell>

                              <TableCell>
                                <span
                                  className={`inline-block text-[11px] font-medium px-2.5 py-0.5 rounded border ${
                                    isAdm
                                      ? "bg-purple-50 text-purple-800 border-purple-100"
                                      : "bg-emerald-50 text-emerald-800 border-emerald-100"
                                  }`}
                                >
                                  {isAdm ? "Operations Admin" : "Field Officer"}
                                </span>
                              </TableCell>

                              <TableCell className="text-center">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOfficerForFarmers(officer)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                                    officer.farmerCount > 0
                                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                                      : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                                  }`}
                                  title="Click to view all registered farmers"
                                >
                                  <span>👥</span>
                                  <span>
                                    {officer.farmerCount} {officer.farmerCount === 1 ? "Farmer" : "Farmers"}
                                  </span>
                                </button>
                              </TableCell>

                              <TableCell className="text-xs text-slate-500">
                                {officer.createdAt
                                  ? new Date(officer.createdAt).toLocaleDateString("en-GB")
                                  : "—"}
                              </TableCell>

                              <TableCell>
                                <StatusBadge status="active" />
                              </TableCell>

                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedOfficerForFarmers(officer)}
                                    className="h-7 px-2.5 text-xs font-medium rounded gap-1 text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    <span>View Farmers ({officer.farmerCount})</span>
                                  </Button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedOfficerId(isExpanded ? null : officer.id)
                                    }
                                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded"
                                    title={isExpanded ? "Collapse inline view" : "Expand inline view"}
                                  >
                                    <svg
                                      className={`w-4 h-4 transition-transform ${
                                        isExpanded ? "rotate-180" : ""
                                      }`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteOfficer(officer.id, officer.fullName)}
                                    className="text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer ml-1"
                                    title="Delete Officer"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>

                            {/* Inline Expansion View */}
                            {isExpanded && (
                              <TableRow className="bg-[#F8FAFC]">
                                <TableCell colSpan={7} className="p-4 sm:p-5">
                                  <div className="border border-gray-200 rounded-md bg-white p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h4 className="text-xs font-bold text-[#0E121B]">
                                          Farmers Registered by {officer.fullName}
                                        </h4>
                                        <p className="text-[11px] text-slate-500">
                                          Total: {officer.farmerCount} farmer{officer.farmerCount === 1 ? "" : "s"}
                                        </p>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setSelectedOfficerForFarmers(officer)}
                                        className="h-7 text-xs px-2.5 text-slate-700"
                                      >
                                        Open Full Inspection Modal
                                      </Button>
                                    </div>

                                    {officer.farmers.length === 0 ? (
                                      <div className="py-6 text-center text-xs text-slate-500">
                                        No farmers registered by this officer yet.
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                          <thead>
                                            <tr className="border-b border-gray-200 bg-slate-50 text-slate-600">
                                              <th className="py-2 px-3 font-semibold">Farmer ID</th>
                                              <th className="py-2 px-3 font-semibold">Full Name</th>
                                              <th className="py-2 px-3 font-semibold">Phone</th>
                                              <th className="py-2 px-3 font-semibold">State / LGA</th>
                                              <th className="py-2 px-3 font-semibold">Village / Community</th>
                                              <th className="py-2 px-3 font-semibold">Programme</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100">
                                            {officer.farmers.map((farmer) => (
                                              <tr key={farmer.id} className="hover:bg-slate-50/50">
                                                <td className="py-2 px-3 font-normal text-slate-900">
                                                  {farmer.id}
                                                </td>
                                                <td className="py-2 px-3 font-medium text-slate-900">
                                                  {farmer.fullName}
                                                </td>
                                                <td className="py-2 px-3 text-slate-700 font-normal">
                                                  {farmer.phoneNumber}
                                                </td>
                                                <td className="py-2 px-3 text-slate-600">
                                                  {farmer.stateName || "—"} &bull; {farmer.lgaName || "—"}
                                                </td>
                                                <td className="py-2 px-3 text-slate-700">
                                                  {farmer.village || "—"}
                                                </td>
                                                <td className="py-2 px-3 text-slate-600">
                                                  {farmer.programme || "—"}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dedicated Inspection Modal: View Farmers Registered by Officer */}
      {selectedOfficerForFarmers && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 border-b border-gray-200 flex items-center justify-between bg-slate-50/80">
              <div className="space-y-0.5 min-w-0 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-[#0E121B] truncate">
                    Farmers: {selectedOfficerForFarmers.fullName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {selectedOfficerForFarmers.farmerCount} Total
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                  {selectedOfficerForFarmers.email}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedOfficerForFarmers(null);
                  setFarmerFilterQuery("");
                }}
                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer shrink-0"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-3 sm:p-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="w-full sm:w-72">
                <InputField
                  placeholder="Search farmer name, phone, village..."
                  value={farmerFilterQuery}
                  onChange={(e) => setFarmerFilterQuery(e.target.value)}
                  icon={
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  }
                />
              </div>

              <div className="text-xs text-slate-500 shrink-0">
                Showing {modalFarmersList.length} of {selectedOfficerForFarmers.farmerCount} record{selectedOfficerForFarmers.farmerCount === 1 ? "" : "s"}
              </div>
            </div>

            {/* Modal Body: Mobile Cards & Desktop Table */}
            <div className="flex-1 overflow-y-auto p-0 scrollbar-thin">
              {modalFarmersList.length === 0 ? (
                <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xl mb-3">
                    🌾
                  </div>
                  <h4 className="text-sm font-semibold text-[#0E121B]">
                    {farmerFilterQuery ? "No matching farmers found" : "No Farmers Registered Yet"}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    {farmerFilterQuery
                      ? "Try searching with a different name, village, or phone number."
                      : `${selectedOfficerForFarmers.fullName} has not submitted any farmer registrations yet.`}
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile Card List (< md) */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {modalFarmersList.map((farmer) => (
                      <div key={farmer.id} className="p-3.5 space-y-2 bg-white">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h5 className="font-semibold text-xs text-[#0E121B] truncate">
                              {farmer.fullName}
                            </h5>
                            <span className="text-[11px] text-slate-500 font-normal">
                              {farmer.id}
                            </span>
                          </div>
                          <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 shrink-0">
                            {farmer.programme}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-gray-50">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Phone</span>
                            <a
                              href={`tel:${farmer.phoneNumber}`}
                              className="text-emerald-700 font-medium hover:underline"
                            >
                              {farmer.phoneNumber}
                            </a>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Location</span>
                            <span className="text-slate-700 truncate block">
                              {farmer.village || "—"}, {farmer.lgaName || "—"}
                            </span>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 pt-0.5 flex items-center justify-between">
                          <span>Date: {farmer.createdAt ? new Date(farmer.createdAt).toLocaleDateString("en-GB") : "—"}</span>
                          <span>{farmer.stateName || ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table (>= md) */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table className="min-w-[650px]">
                      <TableHeader className="sticky top-0 z-10 bg-[#F5F7FA]">
                        <TableRow>
                          <TableHead>Farmer Unique ID</TableHead>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Contact Phone</TableHead>
                          <TableHead>State & LGA</TableHead>
                          <TableHead>Village / Community</TableHead>
                          <TableHead>Programme</TableHead>
                          <TableHead>Registered Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {modalFarmersList.map((farmer) => (
                          <TableRow key={farmer.id}>
                            <TableCell className="font-normal text-xs text-slate-900">
                              {farmer.id}
                            </TableCell>
                            <TableCell className="font-medium text-xs text-[#0E121B]">
                              {farmer.fullName}
                            </TableCell>
                            <TableCell className="font-normal text-xs text-slate-700">
                              {farmer.phoneNumber}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">
                              {farmer.stateName || "—"} &bull; {farmer.lgaName || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-slate-700">
                              {farmer.village || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">
                              {farmer.programme || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {farmer.createdAt
                                ? new Date(farmer.createdAt).toLocaleDateString("en-GB")
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-none">
                Registered by: <strong className="text-slate-800">{selectedOfficerForFarmers.fullName}</strong>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedOfficerForFarmers(null);
                  setFarmerFilterQuery("");
                }}
                className="h-8 px-4 text-xs font-medium"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
