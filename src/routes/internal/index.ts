import { Router } from 'express';
import { getInternalRecordsRouter, getInternalUsersRouter } from '..';

export * from './users';
export * from './records';
export * from './couponGroups';

export function getInternalRouter(): Router {
  const router = Router();

  router.use('/users', getInternalUsersRouter());
  router.use('/records', getInternalRecordsRouter());

  return router;
}
