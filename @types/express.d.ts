import 'express';
import { CardModel, RecordModel } from '@prisma/client';
import { UserModel } from '../src';

declare global {
  namespace Express {
    interface Request {
      sessionId: string;
      user: UserModel;
      card: CardModel;
      record: RecordModel;
      coupon: CouponModel;
      internal: {
        sub: string;
        iss: string;
        aud: string;
        iat: Date;
        exp: Date;
        sessionId: string;
        user: UserModel;
        record: RecordModel;
        coupon: CouponModel;
      };
    }
  }
}
