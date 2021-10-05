import { Router } from 'express';
import {
  Card,
  getInternalUsersCouponsRouter,
  InternalUserMiddleware,
  RESULT,
  Wrapper,
} from '../../..';

export * from '../records';
export * from './coupons';

export function getInternalUsersRouter(): Router {
  const router = Router();

  router.use(
    '/:userId/coupons',
    InternalUserMiddleware(),
    getInternalUsersCouponsRouter()
  );

  router.get(
    '/:userId/ready',
    InternalUserMiddleware(),
    Wrapper(async (req) => {
      await Card.checkReady(req.internal.user);
      throw RESULT.SUCCESS();
    })
  );

  return router;
}
