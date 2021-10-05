import { Router } from 'express';
import {
  $$$,
  Coupon,
  InternalCouponMiddleware,
  RESULT,
  Wrapper,
} from '../../..';

export function getInternalUsersCouponsRouter(): Router {
  const router = Router();

  router.get(
    '/',
    Wrapper(async (req) => {
      const { user } = req.internal;
      const { coupons, total } = await Coupon.getCoupons(user, req.query);
      throw RESULT.SUCCESS({ details: { coupons, total } });
    })
  );

  router.get(
    '/:couponId',
    InternalCouponMiddleware(),
    Wrapper(async (req) => {
      const { coupon } = req.internal;
      throw RESULT.SUCCESS({ details: { coupon } });
    })
  );

  router.post(
    '/',
    Wrapper(async (req) => {
      const { user } = req.internal;
      const coupon = await $$$(Coupon.enrollCoupon(user, req.body.code));
      throw RESULT.SUCCESS({ details: { coupon } });
    })
  );

  router.get(
    '/:couponId/redeem',
    InternalCouponMiddleware(),
    Wrapper(async (req) => {
      const properties = await Coupon.redeemCoupon(req.internal.coupon);
      throw RESULT.SUCCESS({ details: { properties } });
    })
  );

  router.post(
    '/:couponId',
    InternalCouponMiddleware(),
    Wrapper(async (req) => {
      const coupon = await $$$(
        Coupon.modifyCoupon(req.internal.coupon, req.body)
      );

      throw RESULT.SUCCESS({ details: { coupon } });
    })
  );

  return router;
}
