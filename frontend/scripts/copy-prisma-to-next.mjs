import { cpSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const prismaClientDir = join(process.cwd(), "node_modules/.prisma/client");
const targetDir = join(process.cwd(), ".next/server/node_modules/.prisma/client");

if (!existsSync(prismaClientDir)) {
  console.error("Prisma client not found at", prismaClientDir);
  process.exit(1);
}

mkdirSync(join(process.cwd(), ".next/server/node_modules/.prisma"), { recursive: true });
cpSync(prismaClientDir, targetDir, { recursive: true });
console.log("Copied Prisma query engine to .next/server");
