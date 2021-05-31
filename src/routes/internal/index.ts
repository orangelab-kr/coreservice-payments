import { Router } from 'express';
import {
  getInternalRecordsRouter,
  InternalUserMiddleware,
  getInternalCouponsRouter,
} from '../..';

export * from './records';
export * from './coupons';

export function getInternalRouter() {
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

  return router;
}
