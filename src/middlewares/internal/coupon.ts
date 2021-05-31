import { Callback, Coupon, InternalError, OPCODE, Wrapper } from '../..';

export function InternalCouponMiddleware(): Callback {
  return Wrapper(async (req, res, next) => {
    const {
      internal: { user },
      params: { couponId },
    } = req;

    if (!user || !couponId) {
      throw new InternalError('쿠폰을 찾을 수 없습니다', OPCODE.REQUIRED_LOGIN);
    }

    const coupon = await Coupon.getCouponOrThrow(user, couponId);
    req.internal.coupon = coupon;

    await next();
  });
}
