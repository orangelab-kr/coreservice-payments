import { Router } from 'express';
import { $$$, Coupon, InternalCouponMiddleware, OPCODE, Wrapper } from '../..';

export function getInternalCouponsRouter() {
  const router = Router();

  router.get(
    '/',
    Wrapper(async (req, res) => {
      const { user } = req.internal;
      const { coupons, total } = await Coupon.getCoupons(user, req.query);
      res.json({ opcode: OPCODE.SUCCESS, coupons, total });
    })
  );

  router.get(
    '/:couponId',
    InternalCouponMiddleware(),
    Wrapper(async (req, res) => {
      const { coupon } = req.internal;
      res.json({ opcode: OPCODE.SUCCESS, coupon });
    })
  );

  router.post(
    '/',
    Wrapper(async (req, res) => {
      const { user } = req.internal;
      const coupon = await $$$(Coupon.enrollCoupon(user, req.body.code));
      res.json({ opcode: OPCODE.SUCCESS, coupon });
    })
  );

  router.post(
    '/:couponId',
    InternalCouponMiddleware(),
    Wrapper(async (req, res) => {
      const coupon = await $$$(
        Coupon.modifyCoupon(req.internal.coupon, req.body)
      );

      res.json({ opcode: OPCODE.SUCCESS, coupon });
    })
  );

  return router;
}
