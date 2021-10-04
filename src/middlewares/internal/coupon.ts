import { Coupon, RESULT, Wrapper, WrapperCallback } from '../..';

export function InternalCouponMiddleware(): WrapperCallback {
  return Wrapper(async (req, res, next) => {
    const {
      internal: { user },
      params: { couponId },
    } = req;

    if (!user || !couponId) throw RESULT.CANNOT_FIND_COUPON();
    const coupon = await Coupon.getCouponOrThrow(user, couponId, true);
    req.internal.coupon = coupon;

    next();
  });
}
