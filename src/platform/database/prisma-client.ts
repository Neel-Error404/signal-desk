import { PrismaClient } from "@prisma/client";

const globalPrisma = globalThis as typeof globalThis & {
  signalDeskPrisma?: PrismaClient;
};

export function getPrismaClient(): PrismaClient {
  if (globalPrisma.signalDeskPrisma === undefined) {
    globalPrisma.signalDeskPrisma = new PrismaClient({ log: [] });
  }
  return globalPrisma.signalDeskPrisma;
}
