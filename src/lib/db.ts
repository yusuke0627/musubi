import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Backward compatibility for better-sqlite3 based code during transition
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = (typeof process !== 'undefined' && typeof process.cwd === 'function')
  ? path.join(process.cwd(), 'adnetwork.db')
  : 'adnetwork.db';

export const db = new Database(dbPath);

export function initSchema() {
  // Prisma handles schema via migrations now
  // console.log('Schema is managed by Prisma migrations.');
}

export default prisma;
