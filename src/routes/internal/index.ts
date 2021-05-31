import { Router } from 'express';
import { getInternalRecordsRouter, InternalUserMiddleware } from '../..';

export * from './records';

export function getInternalRouter() {
  const router = Router();

  router.use(
    '/:userId/records',
    InternalUserMiddleware(),
    getInternalRecordsRouter()
  );

  return router;
}
