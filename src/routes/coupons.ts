import { Router } from 'express';
import { $$$, Coupon, CouponMiddleware, RESULT, Wrapper } from '..';

export function getCouponsRouter(): Router {
  const router = Router();

  router.get(
    '/',
    Wrapper(async (req) => {
      const { total, coupons } = await Coupon.getCoupons(req.user, req.query);
      throw RESULT.SUCCESS({ details: { coupons, total } });
    })
  );

  router.get(
    '/:couponId',
    CouponMiddleware(),
    Wrapper(async (req) => {
      const { coupon } = req;
      throw RESULT.SUCCESS({ details: { coupon } });
    })
  );

  router.get(
    '/:couponId/redeem',
    CouponMiddleware(),
    Wrapper(async (req) => {
      const properties = await Coupon.redeemCoupon(req.coupon);
      throw RESULT.SUCCESS({ details: { properties } });
    })
  );

  router.post(
    '/',
    Wrapper(async (req) => {
      const coupon = await $$$(Coupon.enrollCouponByCode(req.user, req.body));
      throw RESULT.SUCCESS({ details: { coupon } });
    })
  );

  router.delete(
    '/:couponId',
    CouponMiddleware(),
    Wrapper(async (req) => {
      await $$$(Coupon.deleteCoupon(req.coupon));
      throw RESULT.SUCCESS();
    })
  );

  return router;
}
