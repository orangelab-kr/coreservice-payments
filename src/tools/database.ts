import { PrismaClient } from '@prisma/client';

export class Database {
  public static prisma = new PrismaClient();

  public static initPrisma(): void {
    Database.prisma.$use(async (params, next) => {
      const bypassSoftDeleted: string[] = [];
      if (params.model && !bypassSoftDeleted.includes(params.model)) {
        if (!['create', 'update', 'upsert'].includes(params.action)) {
          if (!params.args.where) {
            params.args.where = {};
          }

          if (!params.args.where['deletedAt']) {
            params.args.where['deletedAt'] = null;
          }
        }

        if (['delete', 'deleteMany'].includes(params.action)) {
          switch (params.action) {
            case 'delete':
              params.action = 'update';
              break;
            case 'deleteMany':
              params.action = 'updateMany';
              break;
          }

          if (!params.args.data) {
            params.args.data = {};
          }

          params.args.data['deletedAt'] = new Date();
        }
      }

      return next(params);
    });
  }
}
