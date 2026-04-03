import { PrismaClient } from "../../prisma/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import path from "path";

// Prisma 7 with Driver Adapter
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./adnetwork.db",
});

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Raw SQL database connection for existing code
const dbPath =
  typeof process !== "undefined" && typeof process.cwd === "function"
    ? path.join(process.cwd(), "adnetwork.db")
    : "adnetwork.db";

export const db = new Database(dbPath);

export function initSchema() {
  // Prisma handles schema via migrations now
}

export default prisma;
