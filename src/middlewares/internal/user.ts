import dayjs, { Dayjs } from 'dayjs';
import {
  Callback,
  getAccountsClient,
  InternalError,
  logger,
  OPCODE,
  Wrapper,
} from '../..';

export function InternalUserMiddleware(): Callback {
  const accountsClient = getAccountsClient();

  return Wrapper(async (req, res, next) => {
    try {
      const { userId } = req.params;
      if (typeof userId !== 'string') throw new Error();
      const { user } = await accountsClient.get(`users/${userId}`).json();

      req.internal.user = {
        userId: user.userId,
        realname: user.realname,
        phoneNo: user.phoneNo,
        email: user.email,
        birthday: dayjs(user.birthday),
        usedAt: dayjs(user.usedAt),
        createdAt: dayjs(user.createdAt),
        updatedAt: dayjs(user.updatedAt),
      };

      next();
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'prod') {
        logger.error(err.message);
        logger.error(err.stack);
      }

      throw new InternalError(
        '인증이 필요한 서비스입니다.',
        OPCODE.REQUIRED_LOGIN
      );
    }
  });
}
