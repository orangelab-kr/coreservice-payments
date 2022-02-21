import { Router } from 'express';
import {
  Card,
  clusterInfo,
  getCardsRouter,
  getCouponsRouter,
  getInternalRouter,
  getRecordsRouter,
  getWebhookRouter,
  InternalMiddleware,
  RESULT,
  UserMiddleware,
  Wrapper,
} from '..';
import { getDirectRouter } from './direct';

export * from './cards';
export * from './coupons';
export * from './direct';
export * from './internal';
export * from './records';
export * from './webhook';

export function getRouter(): Router {
  const router = Router();

  router.use(['/direct', '/legacy'], getDirectRouter());
  router.use('/cards', UserMiddleware(), getCardsRouter());
  router.use('/records', UserMiddleware(), getRecordsRouter());
  router.use('/coupons', UserMiddleware(), getCouponsRouter());
  router.use('/internal', InternalMiddleware(), getInternalRouter());
  router.use('/webhook', getWebhookRouter());
  router.get(
    '/',
    Wrapper(async () => {
      throw RESULT.SUCCESS({ details: clusterInfo });
    })
  );

  router.get(
    '/ready',
    UserMiddleware(),
    Wrapper(async (req) => {
      await Card.checkReady(req.user);
      throw RESULT.SUCCESS();
    })
  );

  return router;
}
