import { Router } from 'express';
import {
  $$$,
  CouponGroup,
  InternalCouponGroupMiddleware,
  RESULT,
  Wrapper,
} from '../..';

export function getInternalCouponGroupsRouter(): Router {
  const router = Router();

  router.get(
    '/',
    Wrapper(async (req) => {
      const { couponGroups, total } = await CouponGroup.getCouponGroups(
        req.query
      );

      throw RESULT.SUCCESS({ details: { couponGroups, total } });
    })
  );

  router.post(
    '/',
    Wrapper(async (req) => {
      const couponGroup = await $$$(CouponGroup.createCouponGroup(req.body));
      throw RESULT.SUCCESS({ details: { couponGroup } });
    })
  );

  router.get(
    '/:couponGroupId',
    InternalCouponGroupMiddleware(),
    Wrapper(async (req) => {
      const { couponGroup } = req.internal;
      throw RESULT.SUCCESS({ details: { couponGroup } });
    })
  );

  router.post(
    '/:couponGroupId',
    InternalCouponGroupMiddleware(),
    Wrapper(async (req) => {
      const couponGroup = await $$$(
        CouponGroup.modifyCouponGroup(req.internal.couponGroup, req.body)
      );

      throw RESULT.SUCCESS({ details: { couponGroup } });
    })
  );

  router.delete(
    '/:couponGroupId',
    InternalCouponGroupMiddleware(),
    Wrapper(async (req) => {
      const { couponGroup } = req.internal;
      await $$$(CouponGroup.deleteCouponGroup(couponGroup));
      throw RESULT.SUCCESS();
    })
  );

  return router;
}
