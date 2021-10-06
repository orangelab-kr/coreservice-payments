import dayjs, { Dayjs } from 'dayjs';
import {
  getCoreServiceClient,
  logger,
  RESULT,
  Wrapper,
  WrapperCallback,
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

export function UserMiddleware(): WrapperCallback {
  return Wrapper(async (req, res, next) => {
    try {
      const { headers } = req;
      const { authorization } = headers;
      if (typeof authorization !== 'string') throw Error();
      const sessionId = authorization.substr(7);
      const { user } = await getCoreServiceClient('accounts')
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
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'prod') {
        logger.error(err.message);
        logger.error(err.stack);
      }

      throw RESULT.REQUIRED_LOGIN();
    }
  });
}
