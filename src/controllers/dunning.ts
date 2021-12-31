import { DunningModel, Prisma, RecordModel } from '@prisma/client';
import { prisma } from '..';

export class Dunning {
  public static async addDunning(
    record: RecordModel,
    type: 'retry' | 'call' | 'message'
  ): Promise<DunningModel> {
    const { recordId } = record;
    const data: Prisma.DunningModelUncheckedCreateInput = {};
    if (type === 'retry') data.recordRetryId = recordId;
    if (type === 'call') data.recordCallId = recordId;
    if (type === 'message') data.recordMessageId = recordId;
    return prisma.dunningModel.create({ data });
  }
}
