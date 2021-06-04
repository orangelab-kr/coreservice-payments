import dayjs, { Dayjs } from 'dayjs';
import {
  Callback,
  getAccountsClient,
  InternalError,
  logger,
  OPCODE,
  Wrapper,
} from '..';

export interface UserModel {
  userId: string;
  realname: string;
  phoneNo: string;
  email?: string;
  birthday: Dayjs;
  usedAt: Dayjs;
  createdAt: Dayjs;
  updatedAt: Dayjs;
}

export function UserMiddleware(): Callback {
  const accountsClient = getAccountsClient();

  return Wrapper(async (req, res, next) => {
    try {
      const { headers } = req;
      const { authorization } = headers;
      if (typeof authorization !== 'string') throw new Error();
      const sessionId = authorization.substr(7);
      const { user } = await accountsClient
        .post(`users/authorize`, { json: { sessionId } })
        .json();

      req.sessionId = sessionId;
      req.user = {
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
    } catch (err) {
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
