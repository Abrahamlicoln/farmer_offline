"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useNetwork } from "@/context/NetworkContext";
import { generateUniqueFarmerId } from "@/lib/uniqueId";
import { farmerFormSchema, FarmerFormData, PROGRAMMES } from "@/lib/validations/farmerSchema";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InputField } from "@/components/ui/InputField";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import { Button } from "@/components/ui/button";
import { CustomAlert } from "@/components/ui/CustomAlert";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import Link from "next/link";
import { getActiveSession } from "@/lib/auth";
import { LgaItem, PollingUnitItem } from "@/types";
import { syncPendingFarmers } from "@/lib/syncService";

export default function RegisterFarmerPage() {
  const { isOnline, triggerSync } = useNetwork();

  // Local state for duplicate phone warning
  const [phoneWarning, setPhoneWarning] = useState<string | null>(null);
  const [duplicateFarmerInfo, setDuplicateFarmerInfo] = useState<{
    id: string;
    fullName: string;
    source: "local" | "server";
  } | null>(null);

  // Success state after registration
  const [lastRegisteredId, setLastRegisteredId] = useState<string | null>(null);
  const [customVillageMode, setCustomVillageMode] = useState(false);

  // Reactive Dexie queries for offline locations
  const states = useLiveQuery(() => db.states.toArray(), [], []);

  // Form setup with react-hook-form and Zod
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FarmerFormData>({
    resolver: zodResolver(farmerFormSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      stateCode: "",
      stateName: "",
      lgaId: "",
      lgaName: "",
      village: "",
      pollingUnitCode: "",
      programme: "Maize Seed & Fertilizer",
    },
  });

  const selectedStateCode = watch("stateCode");
  const selectedLgaId = watch("lgaId");
  const selectedVillage = watch("village");
  const inputPhoneNumber = watch("phoneNumber");

  // Reactive LGAs based on selected state
  const lgas = useLiveQuery(
    () => {
      if (!selectedStateCode) return Promise.resolve([] as LgaItem[]);
      return db.lgas.where("stateId").equals(selectedStateCode).toArray();
    },
    [selectedStateCode],
    [] as LgaItem[]
  );

  // Reactive location units based on selected LGA for Village search
  const villageUnits = useLiveQuery(
    () => {
      if (!selectedLgaId) return Promise.resolve([] as PollingUnitItem[]);
      return db.pollingUnits.where("lgaId").equals(selectedLgaId).toArray();
    },
    [selectedLgaId],
    [] as PollingUnitItem[]
  );

  // State Options for SearchableSelectField
  const stateOptions = useMemo(() => {
    return (states || []).map((s) => ({
      value: s.code,
      label: s.name,
    }));
  }, [states]);

  // LGA Options for SearchableSelectField
  const lgaOptions = useMemo(() => {
    return (lgas || []).map((l) => ({
      value: l.id,
      label: l.name,
    }));
  }, [lgas]);

  // Village Options for SearchableSelectField (NO mention of polling units)
  const villageOptions = useMemo(() => {
    const list = (villageUnits || []).map((v) => ({
      value: v.name,
      label: v.name,
    }));

    if (selectedLgaId) {
      list.push({
        value: "__CUSTOM__",
        label: "+ Type Custom Village / Settlement",
      });
    }

    return list;
  }, [villageUnits, selectedLgaId]);

  // Handle State Change
  const handleStateChange = (code: string) => {
    const matched = states?.find((s) => s.code === code);
    setValue("stateCode", code, { shouldValidate: true });
    setValue("stateName", matched?.name || "", { shouldValidate: true });
    setValue("lgaId", "");
    setValue("lgaName", "");
    setValue("village", "");
    setValue("pollingUnitCode", "");
    setCustomVillageMode(false);
  };

  // Handle LGA Change
  const handleLgaChange = (lgaId: string) => {
    const matched = lgas?.find((l) => l.id === lgaId);
    setValue("lgaId", lgaId, { shouldValidate: true });
    setValue("lgaName", matched?.name || "", { shouldValidate: true });
    setValue("village", "");
    setValue("pollingUnitCode", "");
    setCustomVillageMode(false);
  };

  // Handle Village Change
  const handleVillageChange = (villageName: string) => {
    if (villageName === "__CUSTOM__") {
      setCustomVillageMode(true);
      setValue("village", "");
      setValue("pollingUnitCode", "");
    } else {
      const matched = villageUnits?.find((v) => v.name === villageName);
      setValue("village", villageName, { shouldValidate: true });
      setValue("pollingUnitCode", matched?.delimitation || undefined);
    }
  };

  // Duplicate Phone Check
  useEffect(() => {
    if (!inputPhoneNumber || inputPhoneNumber.trim().length < 8) {
      setPhoneWarning(null);
      setDuplicateFarmerInfo(null);
      return;
    }

    const checkDuplicatePhone = async () => {
      const cleanPhone = inputPhoneNumber.trim();

      // 1. Check local DB
      const localMatch = await db.farmers
        .where("phoneNumber")
        .equals(cleanPhone)
        .first();

      if (localMatch) {
        setPhoneWarning(
          `Phone number already registered for ${localMatch.fullName} (ID: ${localMatch.id}).`
        );
        setDuplicateFarmerInfo({
          id: localMatch.id,
          fullName: localMatch.fullName,
          source: "local",
        });
        return;
      }

      // 2. If online, check server
      if (isOnline) {
        try {
          const res = await fetch(
            `/api/farmers/check-phone?phone=${encodeURIComponent(cleanPhone)}`
          );
          const data = await res.json();
          if (data.exists && data.farmer) {
            setPhoneWarning(
              `Phone number exists for ${data.farmer.fullName} in ${data.farmer.stateName} (ID: ${data.farmer.id}).`
            );
            setDuplicateFarmerInfo({
              id: data.farmer.id,
              fullName: data.farmer.fullName,
              source: "server",
            });
            return;
          }
        } catch (e) {
          console.warn("[CheckPhone] Server check skipped offline:", e);
        }
      }

      setPhoneWarning(null);
      setDuplicateFarmerInfo(null);
    };

    const timer = setTimeout(checkDuplicatePhone, 350);
    return () => clearTimeout(timer);
  }, [inputPhoneNumber, isOnline]);

  // Form Submission Handler
  const onSubmit = async (data: FarmerFormData) => {
    try {
      const uniqueId = await generateUniqueFarmerId();
      const now = new Date().toISOString();
      const session = getActiveSession();
      const officerName = session?.user?.fullName || "Field Officer";

      const newRecord = {
        id: uniqueId,
        fullName: data.fullName.trim(),
        phoneNumber: data.phoneNumber.trim(),
        stateCode: data.stateCode,
        stateName: data.stateName,
        lgaId: data.lgaId || undefined,
        lgaName: data.lgaName,
        village: data.village.trim(),
        pollingUnitCode: data.pollingUnitCode || undefined,
        programme: data.programme,
        registeredBy: officerName,
        syncStatus: "pending" as const,
        createdAt: now,
        updatedAt: now,
      };

      // 1. Save directly to local storage
      await db.farmers.add(newRecord);

      setLastRegisteredId(uniqueId);
      toast.success(`Farmer record saved! ID: ${uniqueId}`, {
        description: isOnline
          ? "Syncing to central system..."
          : "Saved locally. Will sync automatically when connection resumes.",
      });

      // Confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });

      // 2. If online, initiate sync
      if (isOnline) {
        triggerSync();
      }

      // Reset form
      reset({
        fullName: "",
        phoneNumber: "",
        stateCode: "",
        stateName: "",
        lgaId: "",
        lgaName: "",
        village: "",
        pollingUnitCode: "",
        programme: "Maize Seed & Fertilizer",
      });
      setPhoneWarning(null);
      setDuplicateFarmerInfo(null);
      setCustomVillageMode(false);
    } catch (err: any) {
      console.error("[Register] Error saving farmer:", err);
      toast.error("Failed to save farmer record. Please try again.");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 font-sans">
      <AppHeader
        title="Register Farmer"
        subtitle="Enroll smallholder farmer and capture bio-data"
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-6">
        {/* Duplicate Phone Warning Alert */}
        {phoneWarning && (
          <CustomAlert
            variant="warning"
            title="Duplicate Phone Number Detected"
            message={
              <div>
                <p>{phoneWarning}</p>
                <p className="mt-1 text-slate-500 text-[11px]">
                  If this farmer shares a family telephone, you may still proceed. Otherwise, please verify the digits.
                </p>
              </div>
            }
            icon={
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            onDismiss={() => setPhoneWarning(null)}
          />
        )}

        {/* Registration Success Banner */}
        {lastRegisteredId && (
          <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-between shadow-none animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-emerald-900 truncate">
                  Farmer Successfully Registered!
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Assigned ID: <span className="font-semibold text-emerald-950">{lastRegisteredId}</span>
                </p>
              </div>
            </div>

            <Link
              href="/farmers"
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 underline whitespace-nowrap"
            >
              View in Field Records &rarr;
            </Link>
          </div>
        )}

        {/* Registration Form Card strictly matching pmtool Card and InputField */}
        <Card className="border border-gray-200/90 shadow-none bg-white rounded-md">
          <CardHeader className="border-b border-gray-200/80 pb-4 pt-5 px-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-[#0E121B]">
                  Farmer Registration Form
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  All fields marked with an asterisk (<span className="text-rose-500">*</span>) are mandatory.
                </CardDescription>
              </div>
              <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200/60">
                2026 Season
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-7">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Row 1: Full Name & Phone Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField
                  label="Farmer Full Name"
                  placeholder="e.g. Musa Ibrahim"
                  requiredIndicator
                  error={errors.fullName?.message}
                  {...register("fullName")}
                  icon={
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />

                <InputField
                  label="Phone Number"
                  placeholder="e.g. 08012345678"
                  requiredIndicator
                  error={errors.phoneNumber?.message}
                  helperText="11 digits (e.g. 080..., 070..., 081..., 090...)"
                  {...register("phoneNumber")}
                  icon={
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  }
                />
              </div>

              {/* Row 2: Location Hierarchy (State -> LGA) using SearchableSelectField */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Searchable State Select */}
                <SearchableSelectField
                  label="State"
                  requiredIndicator
                  placeholder="Search and select State..."
                  searchPlaceholder="Type state name..."
                  value={selectedStateCode}
                  options={stateOptions}
                  onValueChange={handleStateChange}
                  error={errors.stateCode?.message}
                />

                {/* Searchable LGA Select */}
                <SearchableSelectField
                  label="Local Government Area (LGA)"
                  requiredIndicator
                  disabled={!selectedStateCode}
                  placeholder={
                    !selectedStateCode
                      ? "Select State first"
                      : "Search and select LGA..."
                  }
                  searchPlaceholder="Type LGA name..."
                  value={selectedLgaId}
                  options={lgaOptions}
                  onValueChange={handleLgaChange}
                  error={errors.lgaName?.message}
                />
              </div>

              {/* Row 3: Village / Community (Searchable, strictly NO mention of polling unit) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-normal text-slate-700 block pb-1.5 ml-1">
                    Village / Community <span className="text-rose-500">*</span>
                  </label>

                  {selectedLgaId && (
                    <button
                      type="button"
                      onClick={() => setCustomVillageMode(!customVillageMode)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                    >
                      {customVillageMode
                        ? "← Search from village list"
                        : "+ Type custom village name"}
                    </button>
                  )}
                </div>

                {!customVillageMode ? (
                  <SearchableSelectField
                    disabled={!selectedLgaId}
                    placeholder={
                      !selectedLgaId
                        ? "Select LGA first to search villages"
                        : "Search and select Village..."
                    }
                    searchPlaceholder="Type village or community name..."
                    emptyText="No villages found. Click '+ Type custom village name' above."
                    value={selectedVillage}
                    options={villageOptions}
                    onValueChange={handleVillageChange}
                    error={errors.village?.message}
                  />
                ) : (
                  <InputField
                    placeholder="Enter village or community name"
                    requiredIndicator
                    error={errors.village?.message}
                    {...register("village")}
                  />
                )}
              </div>

              {/* Row 4: Agricultural Programme */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-normal text-slate-700 block pb-1.5 ml-1">
                  Agricultural Programme <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {PROGRAMMES.map((prog) => {
                    const isSelected = watch("programme") === prog;
                    return (
                      <label
                        key={prog}
                        onClick={() => setValue("programme", prog as any)}
                        className={`p-3.5 rounded-md border cursor-pointer flex items-center gap-3 transition-all ${
                          isSelected
                            ? "bg-emerald-50/80 border-emerald-500 text-emerald-950 font-semibold ring-1 ring-emerald-500/30"
                            : "bg-white border-gray-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          value={prog}
                          {...register("programme")}
                          className="sr-only"
                        />
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </span>
                        <span className="text-xs leading-tight">{prog}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.programme && (
                  <p className="text-xs text-rose-500 ml-1">{errors.programme.message}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-200/80 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    reset();
                    setPhoneWarning(null);
                    setDuplicateFarmerInfo(null);
                    setCustomVillageMode(false);
                  }}
                  className="px-5"
                >
                  Clear Form
                </Button>

                <Button
                  type="submit"
                  variant="brand"
                  isLoading={isSubmitting}
                  className="h-11 px-7 bg-emerald-700 hover:bg-emerald-800 text-sm font-semibold rounded-md"
                >
                  Save Farmer Record
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
