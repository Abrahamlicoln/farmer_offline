export type SyncStatus = "pending" | "synced" | "failed";

export type ProgrammeType =
  | "Maize Seed & Fertilizer"
  | "Rice Value Chain"
  | "Poultry & Livestock"
  | "Agroforestry & Tree Planting"
  | "Soil Health & Composting";

export interface FarmerRecord {
  id: string; // e.g. "OAF-NG-2026-A8K2Z"
  fullName: string;
  phoneNumber: string;
  stateCode: string;
  stateName: string;
  lgaId?: string;
  lgaName: string;
  village: string;
  pollingUnitCode?: string;
  programme: string;
  registeredBy: string;
  syncStatus: SyncStatus;
  syncError?: string | null;
  syncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StateItem {
  id?: string;
  code: string;
  name: string;
}

export interface LgaItem {
  id: string;
  code: string;
  name: string;
  stateId: string; // state code
}

export interface WardItem {
  id: string;
  code: string;
  name: string;
  lgaId: string;
}

export interface PollingUnitItem {
  id: string;
  code: string;
  name: string;
  delimitation: string;
  wardId?: string;
  lgaId: string;
  stateId: string;
}

export interface SyncPayload {
  batchId: string;
  clientDeviceId?: string;
  records: FarmerRecord[];
}

export interface SyncResult {
  success: boolean;
  batchId: string;
  totalReceived: number;
  syncedCount: number;
  duplicateCount: number;
  failedCount: number;
  syncedIds: string[];
  failedIds: { id: string; reason: string }[];
  timestamp: string;
}

export interface DashboardStats {
  totalFarmers: number;
  syncedFarmers: number;
  pendingFarmers: number;
  failedFarmers: number;
  totalStates: number;
  totalLgas: number;
  totalPollingUnits: number;
  stateDistribution: { stateName: string; count: number }[];
  programmeDistribution: { programme: string; count: number }[];
  lgaDistribution: { lgaName: string; stateName: string; count: number }[];
  recentRegistrations: FarmerRecord[];
}
