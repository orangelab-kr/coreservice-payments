import { PrismaClient } from '@prisma/client';

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

export { prisma };
