import { PrismaClient } from "@prisma/client";
import { NIGERIA_STATES, NIGERIA_LGAS, NIGERIA_POLLING_UNITS } from "../data/locations-seed";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Running database seed...");

  for (const s of NIGERIA_STATES) {
    await prisma.state.upsert({
      where: { code: s.code },
      update: { name: s.name },
      create: { code: s.code, name: s.name },
    });
  }

  for (const l of NIGERIA_LGAS) {
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

  for (const pu of NIGERIA_POLLING_UNITS) {
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

  console.log("✅ Seed completed.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
