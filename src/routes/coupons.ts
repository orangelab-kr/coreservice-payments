import { Router } from 'express';
import { $$$, Coupon, CouponMiddleware, OPCODE, Wrapper } from '..';

export function getCouponsRouter(): Router {
  const router = Router();

  router.get(
    '/',
    Wrapper(async (req, res) => {
      const { total, coupons } = await Coupon.getCoupons(req.user, req.query);
      res.json({ opcode: OPCODE.SUCCESS, coupons, total });
    })
  );

  router.get(
    '/:couponId',
    CouponMiddleware(),
    Wrapper(async (req, res) => {
      const { coupon } = req;
      res.json({ opcode: OPCODE.SUCCESS, coupon });
    })
  );

  router.post(
    '/',
    Wrapper(async (req, res) => {
      const coupon = await $$$(Coupon.enrollCoupon(req.user, req.body.code));
      res.json({ opcode: OPCODE.SUCCESS, coupon });
    })
  );

  return router;
}
