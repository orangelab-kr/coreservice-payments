import { Router } from 'express';
import {
  getInternalCouponGroupsRouter,
  getInternalRecordsRouter,
  getInternalUsersRouter,
} from '..';

export * from './couponGroups';
export * from './records';
export * from './users';

export function getInternalRouter(): Router {
  const router = Router();

  router.use('/users', getInternalUsersRouter());
  router.use('/records', getInternalRecordsRouter());
  router.use('/couponGroups', getInternalCouponGroupsRouter());

  return router;
}
