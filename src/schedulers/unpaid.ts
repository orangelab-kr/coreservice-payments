import { CardModel, RecordModel } from '@prisma/client';
import * as Sentry from '@sentry/node';
import dayjs from 'dayjs';
import { $$$, getCoreServiceClient, logger, Record, UserModel } from '..';
import { Card } from '../controllers';
import { Dunning } from '../controllers/dunning';
import { sendMessageWithMessageGateway } from '../tools/messageGateway';

const cachedUsers: { [key: string]: UserModel } = {};
const lookupFailedUsers: string[] = [];

export const onUnpaidScheduler = async (): Promise<void> => {
  const take = 10;
  let total;
  let skip = 0;

  logger.info('미수금 / 미결제 사용자를 불러옵니다.');
  while (!total || total > skip) {
    Object.keys(cachedUsers).forEach((userId) => delete cachedUsers[userId]);
    const res = await Record.getRecords({ take, skip, onlyUnpaid: true });
    if (res.records.length <= 0) break;
    await Promise.all(res.records.map((record) => processRecord(record)));
    total = res.total;
    skip += take;
  }
};

async function processRecord(record: RecordModel): Promise<void> {
  const { userId } = record;
  const user = await getUserByRecord(record);
  if (!user) {
    logger.debug(`미수금 / 사용자(${userId}) 정보를 불러오지 못해 무시합니다.`);
    return;
  }

  const { realname } = user;
  const { recordId, name } = record;
  try {
    const hasRetrySuccessfully = await retryRecord({ record, user });
    if (hasRetrySuccessfully) {
      logger.debug(
        `미수금 / ${realname}(${userId})님의 ${name}(${recordId})(을)를 결제하였기 때문에 별도의 조치를 취하지 않습니다.`
      );

      return;
    }

    // todo: 미수금 메세지 전송(날짜별)
    console.log(await Dunning.getDunningCount(record, 'message'));
  } catch (err: any) {
    const eventId = Sentry.captureException(err);
    logger.error(
      `미수금 / ${realname}(${userId})님에게 미수금을 걷을 수 없습니다. (${eventId})`
    );
  }
}

async function retryRecord(props: {
  record: RecordModel;
  user: UserModel;
}): Promise<boolean> {
  let { record, user } = props;
  const { userId, realname, phoneNo } = user;
  await Dunning.addDunning(record, 'retry');

  try {
    record = await $$$(Record.retryPayment(user, record));
    logger.info(
      `미수금 / ${realname}(${userId})님의 ${record.name}(${record.recordId})(을)를 결제하였습니다.`
    );
  } catch (err: any) {
    logger.error(
      `미수금 / ${realname}(${userId})님의 ${record.name}(${record.recordId})(을)를 결제할 수 없습니다.`
    );

    return false;
  }

  const { cardId, amount, processedAt } = record;
  const card: CardModel = await $$$(Card.getCard(user, <string>cardId));
  await sendMessageWithMessageGateway({
    phone: phoneNo,
    name: 'unpaid_completed',
    fields: {
      user,
      card,
      record: {
        ...record,
        amount: `${amount.toLocaleString()}원`,
        processedAt: dayjs(processedAt).format('M월 D일 h시 m분'),
      },
    },
  });

  return true;
}

async function getUserByRecord(record: RecordModel): Promise<UserModel | null> {
  const { userId } = record;
  if (lookupFailedUsers.includes(userId)) {
    logger.debug(`미수금 / 사용자(${userId})는 조회 불가능한 사용자입니다.`);
    return null;
  }

  try {
    if (cachedUsers[userId]) return cachedUsers[userId];
    const { user } = await getCoreServiceClient('accounts')
      .get(`users/${userId}`)
      .json();

    cachedUsers[userId] = user;
    return user;
  } catch (err: any) {
    const eventId = Sentry.captureException(err);
    lookupFailedUsers.push(userId);
    logger.error(
      `미수금 / 사용자(${userId})를 조회할 수 없습니다. (${eventId})`
    );

    return null;
  }
}
