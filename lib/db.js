// Singleton Prisma client. Caching this in `globalThis` (not just during
// dev hot-reload, but always — including production) is essential on
// Vercel: each warm serverless container reuses the same execution
// context across requests, and without this cache a fresh PrismaClient
// (and a fresh connection-pool) would be created far too often, quickly
// exhausting Supabase's connection limit (see "EMAXCONNSESSION" in the
// README's troubleshooting section for the full story).
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

globalForPrisma.prisma = prisma;
