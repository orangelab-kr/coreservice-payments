import { Router } from 'express';
import {
  Card,
  getInternalUsersCardsRouter,
  getInternalUsersCouponsRouter,
  InternalUserMiddleware,
  RESULT,
  Wrapper,
} from '../../..';

export * from './cards';
export * from './coupons';

export function getInternalUsersRouter(): Router {
  const router = Router();

  router.use(
    '/:userId/coupons',
    InternalUserMiddleware(),
    getInternalUsersCouponsRouter()
  );

  router.use(
    '/:userId/cards',
    InternalUserMiddleware(),
    getInternalUsersCardsRouter()
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
