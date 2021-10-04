import dayjs from 'dayjs';
import {
  getAccountsClient,
  logger,
  RESULT,
  Wrapper,
  WrapperCallback,
} from '../..';

export function InternalUserMiddleware(): WrapperCallback {
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

      throw RESULT.CANNOT_FIND_USER();
    }
  });
}
