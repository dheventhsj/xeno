import { seedDatabase } from "../src/seed";
import { prisma } from "../src/index";

seedDatabase(Math.min(Number(process.env.SEED_CUSTOMERS ?? 2000), 10000))
  .then((r) => console.log("Seeded", r))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
