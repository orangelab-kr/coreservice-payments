import { Callback, Coupon, InternalError, OPCODE, Wrapper } from '..';

export function CouponMiddleware(): Callback {
  return Wrapper(async (req, res, next) => {
    const {
      user,
      params: { couponId },
    } = req;

    if (!user || !couponId) {
      throw new InternalError('쿠폰을 찾을 수 없습니다', OPCODE.REQUIRED_LOGIN);
    }

    const coupon = await Coupon.getCouponOrThrow(user, couponId);
    req.coupon = coupon;

    await next();
  });
}
