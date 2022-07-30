import { RecordModel } from '@prisma/client';
import * as Sentry from '@sentry/node';
import { getCoreServiceClient, logger } from '../tools';

export class Centercoin {
  public static async giveReward(record: RecordModel): Promise<void> {
    const { displayName, userId, amount } = record;
    const centercoinBalance = Math.floor(amount * 0.1);

    try {
      await getCoreServiceClient('accounts').put({
        url: `users/${record.userId}/centercoin`,
        json: { centercoinBalance, message: displayName },
      });
    } catch (err: any) {
      const eventId = Sentry.captureException(err);
      logger.info(
        `센터코인 / ${userId} 사용자에 대한 리워드를 제공할 수 없습니다. (${eventId})`
      );
    }
  }

  public static async takeReward(record: RecordModel): Promise<void> {
    const { displayName, userId } = record;
    const amount = record.initialAmount - record.amount;
    const centercoinBalance = Math.floor(amount * 0.1);

    try {
      await getCoreServiceClient('accounts').delete({
        url: `users/${record.userId}/centercoin`,
        json: { centercoinBalance, message: displayName },
      });
    } catch (err: any) {
      const eventId = Sentry.captureException(err);
      logger.info(
        `센터코인 / ${userId} 사용자에 대한 리워드를 차감할 수 없습니다. (${eventId})`
      );
    }
  }
}
