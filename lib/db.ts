import Dexie, { type Table } from "dexie";
import { FarmerRecord, StateItem, LgaItem, PollingUnitItem } from "@/types";
import { NIGERIA_STATES, NIGERIA_LGAS, NIGERIA_POLLING_UNITS } from "@/data/locations-seed";

export class OneAcreFundDB extends Dexie {
  farmers!: Table<FarmerRecord, string>;
  states!: Table<StateItem, string>;
  lgas!: Table<LgaItem, string>;
  pollingUnits!: Table<PollingUnitItem, string>;

  constructor() {
    super("OneAcreFundOfflineDB");
    this.version(1).stores({
      farmers: "id, phoneNumber, syncStatus, stateCode, lgaId, village, programme, createdAt, syncedAt",
      states: "code, name",
      lgas: "id, code, name, stateId",
      pollingUnits: "id, code, name, delimitation, lgaId, stateId",
    });
  }
}

export const db = new OneAcreFundDB();

/**
 * Initializes Dexie with the baseline Nigerian location dataset if empty.
 * Runs in under 50ms on first load.
 */
export async function initializeOfflineLocations(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const puCount = await db.pollingUnits.count();
    const lgaCount = await db.lgas.count();

    // If empty or older small baseline, upgrade to full official dataset
    if (lgaCount < 700 || puCount < 1000) {
      console.log("[Dexie] Initializing/upgrading offline locations with complete Nigerian dataset...");
      await db.transaction("rw", db.states, db.lgas, db.pollingUnits, async () => {
        await db.states.clear();
        await db.lgas.clear();
        await db.pollingUnits.clear();

        await db.states.bulkPut(NIGERIA_STATES);
        await db.lgas.bulkPut(NIGERIA_LGAS);
        await db.pollingUnits.bulkPut(NIGERIA_POLLING_UNITS);
      });
      console.log(`[Dexie] Offline locations ready: ${NIGERIA_STATES.length} States, ${NIGERIA_LGAS.length} LGAs, ${NIGERIA_POLLING_UNITS.length} Polling Units.`);
    }
  } catch (error) {
    console.error("[Dexie] Error seeding baseline locations:", error);
  }
}
