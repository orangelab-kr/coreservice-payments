import { Router } from 'express';
import {
  Card,
  getInternalCouponsRouter,
  getInternalRecordsRouter,
  InternalUserMiddleware,
  RESULT,
  Wrapper,
} from '../..';

export * from './coupons';
export * from './records';

export function getInternalRouter(): Router {
  const router = Router();

  router.use(
    '/:userId/records',
    InternalUserMiddleware(),
    getInternalRecordsRouter()
  );

  router.use(
    '/:userId/coupons',
    InternalUserMiddleware(),
    getInternalCouponsRouter()
  );

  router.get(
    '/:userId/ready',
    InternalUserMiddleware(),
    Wrapper(async (req, res) => {
      await Card.checkReady(req.internal.user);
      throw RESULT.SUCCESS();
    })
  );

  return router;
}
