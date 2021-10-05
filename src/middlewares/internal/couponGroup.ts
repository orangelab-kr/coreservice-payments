import { CouponGroup, RESULT, Wrapper, WrapperCallback } from '../..';

export function InternalCouponGroupMiddleware(): WrapperCallback {
  return Wrapper(async (req, res, next) => {
    const { couponGroupId } = req.params;
    if (!couponGroupId) throw RESULT.CANNOT_FIND_COUPON_GROUP();
    const couponGroup = await CouponGroup.getCouponGroupOrThrow(couponGroupId);
    req.internal.couponGroup = couponGroup;

    next();
  });
}
