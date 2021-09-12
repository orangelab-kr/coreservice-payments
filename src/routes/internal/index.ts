import { Router } from 'express';
import {
  Card,
  getInternalCouponsRouter,
  getInternalRecordsRouter,
  InternalUserMiddleware,
  Wrapper,
} from '../..';
import { OPCODE } from '../../tools';

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
      res.json({ opcode: OPCODE.SUCCESS });
    })
  );

  return router;
}
