import { PrismaClient } from "@prisma/client";
import locationsData from "../data/nigeria-locations.json";

const prisma = new PrismaClient();

async function main() {
  console.log("=========================================================");
  console.log("🌱 Seeding Neon PostgreSQL with Official Nigerian Locations");
  console.log("=========================================================\n");

  // Step 1: Clean existing data in proper Foreign Key order
  console.log("🧹 Step 1: Clearing existing records to ensure clean state...");
  try {
    const dFarmers = await prisma.farmer.deleteMany({});
    console.log(`   - Cleared ${dFarmers.count} Farmers`);

    const dPUs = await prisma.pollingUnit.deleteMany({});
    console.log(`   - Cleared ${dPUs.count} Polling Units`);

    const dWards = await prisma.ward.deleteMany({});
    console.log(`   - Cleared ${dWards.count} Wards`);

    const dLgas = await prisma.lga.deleteMany({});
    console.log(`   - Cleared ${dLgas.count} LGAs`);

    const dStates = await prisma.state.deleteMany({});
    console.log(`   - Cleared ${dStates.count} States`);
  } catch (err: any) {
    console.warn("⚠️ Notice during table clearing:", err.message);
  }

  // Step 2: Seed States
  const states = locationsData.states;
  console.log(`\n➡️  Step 2: Inserting ${states.length} States into Neon DB...`);
  await prisma.state.createMany({
    data: states.map((s) => ({
      code: s.code,
      name: s.name,
    })),
    skipDuplicates: true,
  });
  console.log(`✅ Successfully seeded ${states.length} States!`);

  // Step 3: Seed LGAs
  const lgas = locationsData.lgas;
  console.log(`\n➡️  Step 3: Inserting ${lgas.length} LGAs into Neon DB...`);
  await prisma.lga.createMany({
    data: lgas.map((l) => ({
      id: l.id,
      code: l.code,
      name: l.name,
      stateId: l.stateId,
    })),
    skipDuplicates: true,
  });
  console.log(`✅ Successfully seeded ${lgas.length} LGAs!`);

  // Step 4: Seed Polling Units in Batches
  const pollingUnits = locationsData.pollingUnits;
  console.log(`\n➡️  Step 4: Inserting ${pollingUnits.length} Polling Units in chunks of 2,000...`);
  const chunkSize = 2000;
  for (let i = 0; i < pollingUnits.length; i += chunkSize) {
    const chunk = pollingUnits.slice(i, i + chunkSize);
    await prisma.pollingUnit.createMany({
      data: chunk.map((pu) => ({
        id: pu.id,
        code: pu.code,
        name: pu.name,
        delimitation: pu.delimitation,
        lgaId: pu.lgaId,
        stateId: pu.stateId,
      })),
      skipDuplicates: true,
    });
    console.log(
      `   - Seeded chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(
        pollingUnits.length / chunkSize
      )} (${Math.min(i + chunkSize, pollingUnits.length)} / ${pollingUnits.length})`
    );
  }
  console.log(`✅ Successfully seeded all ${pollingUnits.length} Polling Units!`);

  console.log("\n🎉 ALL DONE! Neon DB is completely populated with official Nigerian polling unit data!");
}

main()
  .catch((e) => {
    console.error("❌ Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
