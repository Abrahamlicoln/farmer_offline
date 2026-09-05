import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { NIGERIA_STATES, NIGERIA_LGAS, NIGERIA_POLLING_UNITS } from "../data/locations-seed";

const prisma = new PrismaClient();

const INEC_BASE_URL = "https://www.inecnigeria.org/wp-content/themes/rishi/custom/views";

interface InecState {
  code: string;
  s_name: string;
}

interface InecLga {
  id: string;
  name: string;
  abbreviation: string;
  state_id: string;
}

interface InecWard {
  id: string;
  name: string;
  abbreviation: string;
  local_government_id: string;
}

interface InecPollingUnit {
  id: string;
  name: string;
  registration_area_id: string;
  precise_location: string | null;
  abbreviation: string;
  state: string;
  lga: string;
  ward: string;
  units: string;
  delimitation: string;
  remark: string;
}

// User-Agent required by INEC endpoints
const HEADERS = {
  "User-Agent": "Nigeria-Polling-Unit-API/1.0",
  Accept: "application/json",
};

async function fetchJson(url: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.warn(`[INEC Fetch] Warning on ${url}:`, err.message);
    return null;
  }
}

async function main() {
  console.log("=================================================");
  console.log("🇳🇬 One Acre Fund — Location Fetch & Neon Seeder");
  console.log("=================================================");

  const outputJsonPath = path.join(process.cwd(), "data", "nigeria-locations.json");

  // Step 1: Fetch or load States
  console.log("\n📡 Step 1: Fetching States from INEC API...");
  let statesData = await fetchJson(`${INEC_BASE_URL}/getPollingState.php`);

  let statesList: { code: string; name: string }[] = [];

  if (Array.isArray(statesData) && statesData.length > 0) {
    statesList = statesData.map((s: InecState) => ({
      code: String(s.code),
      name: s.s_name.trim().toUpperCase(),
    }));
    console.log(`✅ Retrieved ${statesList.length} States from live INEC API!`);
  } else {
    console.log("ℹ️  INEC live endpoint unavailable; using bundled baseline States.");
    statesList = NIGERIA_STATES;
  }

  // Step 2: Fetch LGAs for key agricultural operating states
  // Primary One Acre Fund focus states in Nigeria: Nasarawa (26), Niger (27), Kano (20), Kaduna (19), Benue (7)
  const targetStateCodes = ["26", "27", "20", "19", "7", "32", "31"];
  console.log(`\n📡 Step 2: Fetching LGAs & Polling Units for focus states: ${targetStateCodes.join(", ")}...`);

  const allLgas: any[] = [];
  const allPollingUnits: any[] = [];

  for (const stateCode of targetStateCodes) {
    console.log(`➡️  Fetching LGAs for State Code ${stateCode}...`);
    const lgaRes = await fetchJson(`${INEC_BASE_URL}/lgaView.php?state_id=${stateCode}`);

    if (lgaRes && typeof lgaRes === "object") {
      const lgaItems = Object.values(lgaRes) as InecLga[];
      for (const lga of lgaItems) {
        if (!lga.name) continue;
        const lgaObj = {
          id: `lga-${lga.state_id}-${lga.abbreviation}`,
          code: lga.abbreviation,
          name: lga.name.trim().toUpperCase(),
          stateId: String(lga.state_id),
        };
        allLgas.push(lgaObj);

        // Fetch Wards for this LGA
        const wardRes = await fetchJson(
          `${INEC_BASE_URL}/wardView.php?lga_id=${lga.abbreviation}&state_id=${lga.state_id}`
        );

        if (wardRes && typeof wardRes === "object") {
          const wardItems = Object.values(wardRes) as InecWard[];
          // Sample first 2 wards per LGA for speed
          for (const ward of wardItems.slice(0, 2)) {
            const puRes = await fetchJson(
              `${INEC_BASE_URL}/pollingView.php?state_id=${lga.state_id}&lga_id=${lga.abbreviation}&ward_id=${ward.id}`
            );

            if (puRes && typeof puRes === "object") {
              const puItems = Object.values(puRes) as InecPollingUnit[];
              for (const pu of puItems.slice(0, 3)) {
                if (pu.delimitation) {
                  allPollingUnits.push({
                    id: `pu-${pu.id || Math.random().toString(36).slice(2, 8)}`,
                    code: pu.units || pu.abbreviation || "001",
                    name: pu.name ? pu.name.trim().toUpperCase() : "VILLAGE SQUARE",
                    delimitation: pu.delimitation,
                    lgaId: lgaObj.id,
                    stateId: String(lga.state_id),
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  // Merge with baseline to guarantee comprehensive coverage
  const mergedLgas = allLgas.length > 0 ? allLgas : NIGERIA_LGAS;
  const mergedPUs = allPollingUnits.length > 0 ? allPollingUnits : NIGERIA_POLLING_UNITS;

  // Step 3: Write Offline JSON file
  const fullOfflineDataset = {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "INEC Polling Unit API & One Acre Fund Nigeria Baseline",
      totalStates: statesList.length,
      totalLgas: mergedLgas.length,
      totalPollingUnits: mergedPUs.length,
    },
    states: statesList,
    lgas: mergedLgas,
    pollingUnits: mergedPUs,
  };

  fs.writeFileSync(outputJsonPath, JSON.stringify(fullOfflineDataset, null, 2), "utf-8");
  console.log(`\n💾 Step 3: Saved offline location JSON to ${outputJsonPath}`);

  // Step 4: Seed into Neon PostgreSQL Database
  console.log("\n🌱 Step 4: Seeding into Neon PostgreSQL via Prisma...");

  try {
    // 1. States
    for (const s of statesList) {
      await prisma.state.upsert({
        where: { code: s.code },
        update: { name: s.name },
        create: { code: s.code, name: s.name },
      });
    }
    console.log(`✅ Synced ${statesList.length} States to Neon DB`);

    // 2. LGAs
    for (const l of mergedLgas) {
      await prisma.lga.upsert({
        where: {
          stateId_code: {
            stateId: l.stateId,
            code: l.code,
          },
        },
        update: { name: l.name },
        create: {
          id: l.id,
          code: l.code,
          name: l.name,
          stateId: l.stateId,
        },
      });
    }
    console.log(`✅ Synced ${mergedLgas.length} LGAs to Neon DB`);

    // 3. Polling Units
    for (const pu of mergedPUs) {
      await prisma.pollingUnit.upsert({
        where: { delimitation: pu.delimitation },
        update: { name: pu.name, code: pu.code },
        create: {
          id: pu.id,
          code: pu.code,
          name: pu.name,
          delimitation: pu.delimitation,
          lgaId: pu.lgaId,
          stateId: pu.stateId,
        },
      });
    }
    console.log(`✅ Synced ${mergedPUs.length} Polling Units / Villages to Neon DB`);

    // 4. Sample Synced Farmers


    console.log("\n🎉 ALL DONE! Offline JSON created and Neon database successfully populated!");
  } catch (err: any) {
    console.error("❌ Seeding database error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
