import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Users into Neon PostgreSQL...");

  const users = [
    {
      email: "officer.nigeria@oneacrefund.org",
      password: "Password123!",
      fullName: "Amina Bello (Field Officer)",
      role: "officer",
    },
    {
      email: "admin.operations@oneacrefund.org",
      password: "Password123!",
      fullName: "Daniel Chukwu (Operations Admin)",
      role: "admin",
    },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: u.password,
        fullName: u.fullName,
        role: u.role,
      },
      create: {
        email: u.email,
        password: u.password,
        fullName: u.fullName,
        role: u.role,
      },
    });
    console.log(`✅ Seeded user: ${user.fullName} (${user.email}) - Role: ${user.role}`);
  }

  console.log("🎉 User seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
