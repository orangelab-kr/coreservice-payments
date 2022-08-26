import dayjs, { Dayjs } from 'dayjs';
import { getCoreServiceClient, RESULT, Wrapper, WrapperCallback } from '..';

export interface UserModel {
  userId: string;
  realname: string;
  profileUrl: string | null;
  phoneNo: string;
  birthday: Date | Dayjs;
  email: string | null;
  licenseId: string | null;
  levelNo: number;
  receiveSMS: Date | Dayjs | null;
  receivePush: Date | Dayjs | null;
  receiveEmail: Date | Dayjs | null;
  usedAt: Date | Dayjs;
  createdAt: Date | Dayjs;
  updatedAt: Date | Dayjs;
}

export function UserMiddleware(): WrapperCallback {
  return Wrapper(async (req, res, next) => {
    const { headers } = req;
    const { authorization } = headers;
    if (typeof authorization !== 'string') throw RESULT.INVALID_ERROR();
    const sessionId = authorization.substring(7);
    const { user } = await getCoreServiceClient('accounts')
      .post(`users/authorize`, { json: { sessionId } })
      .json<{ opcode: number; user: UserModel }>();

    req.sessionId = sessionId;
    req.user = {
      userId: user.userId,
      realname: user.realname,
      profileUrl: user.profileUrl,
      phoneNo: user.phoneNo,
      birthday: dayjs(user.birthday),
      email: user.email,
      licenseId: user.licenseId,
      levelNo: user.levelNo,
      receiveSMS: user.receiveSMS,
      receivePush: user.receivePush,
      receiveEmail: user.receiveEmail,
      usedAt: dayjs(user.usedAt),
      createdAt: dayjs(user.createdAt),
      updatedAt: dayjs(user.updatedAt),
    };

    next();
  });
}
