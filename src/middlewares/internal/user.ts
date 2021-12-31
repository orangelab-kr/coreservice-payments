import dayjs from 'dayjs';
import { getCoreServiceClient, Wrapper, WrapperCallback } from '../..';

export function InternalUserMiddleware(): WrapperCallback {
  return Wrapper(async (req, res, next) => {
    const { userId } = req.params;
    if (typeof userId !== 'string') throw new Error();
    const { user } = await getCoreServiceClient('accounts')
      .get(`users/${userId}`)
      .json();

    req.internal.user = {
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
