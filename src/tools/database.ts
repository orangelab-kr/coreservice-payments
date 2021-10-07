import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  if (global.prisma) return global.prisma;
  const prisma = new PrismaClient();

  prisma.$use(async (params, next) => {
    const bypassSoftDeleted: string[] = [];
    if (params.model && !bypassSoftDeleted.includes(params.model)) {
      if (!['create', 'update', 'upsert', 'delete'].includes(params.action)) {
        if (!params.args.where) params.args.where = {};
        if (!params.args.where['deletedAt']) {
          params.args.where['deletedAt'] = null;
        }
      }

      if (['delete', 'deleteMany'].includes(params.action)) {
        if (params.action === 'delete') params.action = 'update';
        if (params.action === 'deleteMany') params.action = 'updateMany';
        if (!params.args.data) params.args.data = {};
        params.args.data['deletedAt'] = new Date();
      }
    }

    return next(params);
  });

  global.prisma = prisma;
  return prisma;
}

export const prisma = createPrismaClient();
