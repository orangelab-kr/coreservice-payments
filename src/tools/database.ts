import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  if (global.prisma) return global.prisma;
  const prisma = new PrismaClient();
  global.prisma = prisma;
  return prisma;
}

export const prisma = createPrismaClient();
