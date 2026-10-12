import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { buildDemoPlans } from "../src/lib/demoPlans";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Planazo123!";

const seedUsers = [
  { email: "usuario1@planazo.com", name: "Usuario Uno" },
  { email: "usuario2@planazo.com", name: "Usuario Dos" },
];

/**
 * Create-only demo plans for the seeded users. `update: {}` keeps re-runs from overwriting
 * changes an evaluator made through the UI (for example cancelling a demo plan).
 */
async function seedDemoPlans() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo plans when NODE_ENV=production.");
  }

  const users = await prisma.user.findMany({
    where: { email: { in: seedUsers.map((u) => u.email) } },
    select: { id: true, email: true },
  });
  const idByKey = {
    usuario1: users.find((u) => u.email === seedUsers[0].email)?.id,
    usuario2: users.find((u) => u.email === seedUsers[1].email)?.id,
  };
  if (!idByKey.usuario1 || !idByKey.usuario2) {
    throw new Error("Seeded users are missing; cannot create demo plans.");
  }

  for (const demo of buildDemoPlans(new Date())) {
    const plan = await prisma.plan.upsert({
      where: { shareCode: demo.shareCode },
      update: {},
      create: {
        shareCode: demo.shareCode,
        titulo: demo.titulo,
        description: demo.description,
        dueDate: demo.dueDate,
        estado: demo.estado,
        userId: idByKey[demo.owner]!,
      },
    });
    if (demo.guest) {
      await prisma.planMember.upsert({
        where: { planId_userId: { planId: plan.id, userId: idByKey[demo.guest]! } },
        update: {},
        create: { planId: plan.id, userId: idByKey[demo.guest]! },
      });
    }
    console.log(`Seeded demo plan ${demo.shareCode} (${demo.estado})`);
  }
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed test users when NODE_ENV=production.");
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, passwordHash },
      create: { ...user, passwordHash },
    });
    console.log(`Seeded user ${user.email}`);
  }

  await seedDemoPlans();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
