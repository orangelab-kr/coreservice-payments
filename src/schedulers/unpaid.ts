import { RecordModel } from '@prisma/client';
import * as Sentry from '@sentry/node';
import { $$$, getCoreServiceClient, logger, Record, UserModel } from '..';
import { Dunning } from '../controllers/dunning';

const cachedUsers: { [key: string]: UserModel } = {};
const lookupFailedUsers: string[] = [];

export const onUnpaidScheduler = async (): Promise<void> => {
  const take = 10;
  let total;
  let skip = 0;

  while (!total || total > skip) {
    Object.keys(cachedUsers).forEach((userId) => delete cachedUsers[userId]);
    const res = await Record.getRecords({ take, skip, onlyUnpaid: true });
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
  const { recordId, name, createdAt } = record;
  try {
    const hasRetrySuccessfully = await retryRecord({ record, user });
    if (hasRetrySuccessfully) {
      logger.debug(
        `미수금 / ${realname}(${userId})님의 ${name}(${recordId})(을)를 결제하였기 때문에 별도의 조치를 취하지 않습니다.`
      );

      return;
    }

    // todo: 미수금 메세지 전송(날짜별)
  } catch (err: any) {
    const eventId = Sentry.captureException(err);
    logger.error(
      `미수금 / ${realname}(${userId})님에게 리워드 쿠폰을 제공할 수 없습니다. (${eventId})`
    );
  }
}

async function retryRecord(props: {
  record: RecordModel;
  user: UserModel;
}): Promise<boolean> {
  const { record, user } = props;
  const { userId, realname } = user;
  const { recordId, name } = record;
  await Dunning.addDunning(record, 'retry');

  try {
    await $$$(Record.retryPayment(user, record));
    logger.info(
      `미수금 / ${realname}(${userId})님의 ${name}(${recordId})(을)를 결제하였습니다.`
    );
  } catch (err: any) {
    logger.error(
      `미수금 / ${realname}(${userId})님의 ${name}(${recordId})(을)를 결제할 수 없습니다.`
    );

    return false;
  }

  // todo: 미수금 완료 안내
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
