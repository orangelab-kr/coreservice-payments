import { DunningModel, Prisma, RecordModel } from '@prisma/client';
import { logger, prisma } from '..';

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
    const [dunning] = await prisma.$transaction([
      prisma.dunningModel.create({ data }),
      prisma.recordModel.update({
        where: { recordId },
        data: { dunnedAt: new Date() },
      }),
    ]);

    logger.info(
      `재촉 메세지 / ${record.displayName}(${record.recordId}) 결제건을 ${type} 재촉하였습니다.`
    );

    return dunning;
  }

  public static async getDunningCount(
    record: RecordModel,
    type: 'retry' | 'call' | 'message'
  ): Promise<number> {
    const { recordId } = record;
    const where: Prisma.DunningModelWhereInput = {};
    if (type === 'retry') where.recordRetryId = recordId;
    if (type === 'call') where.recordCallId = recordId;
    if (type === 'message') where.recordMessageId = recordId;
    return prisma.dunningModel.count({ where });
  }
}
