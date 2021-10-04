import { Coupon, RESULT, Wrapper, WrapperCallback } from '..';

export function CouponMiddleware(): WrapperCallback {
  return Wrapper(async (req, res, next) => {
    const {
      user,
      params: { couponId },
    } = req;

    if (!user || !couponId) throw RESULT.CANNOT_FIND_COUPON();
    const coupon = await Coupon.getCouponOrThrow(user, couponId, false);
    req.coupon = coupon;

    next();
  });
}
