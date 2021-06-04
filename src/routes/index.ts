import cors from 'cors';
import express, { Application } from 'express';
import morgan from 'morgan';
import os from 'os';
import {
  getCardsRouter,
  getCouponsRouter,
  getInternalRouter,
  getLegacyRouter,
  getRecordsRouter,
  getWebhookRouter,
  InternalError,
  InternalMiddleware,
  logger,
  OPCODE,
  UserMiddleware,
  Wrapper,
} from '..';

export * from './cards';
export * from './coupons';
export * from './internal';
export * from './legacy';
export * from './records';
export * from './webhook';

export function getRouter(): Application {
  const router = express();
  InternalError.registerSentry(router);

  const hostname = os.hostname();
  const logging = morgan('common', {
    stream: { write: (str: string) => logger.info(`${str.trim()}`) },
  });

  router.use(cors());
  router.use(logging);
  router.use(express.json());
  router.use(express.urlencoded({ extended: true }));
  router.use('/legacy', getLegacyRouter());
  router.use('/cards', UserMiddleware(), getCardsRouter());
  router.use('/records', UserMiddleware(), getRecordsRouter());
  router.use('/coupons', UserMiddleware(), getCouponsRouter());
  router.use('/internal', InternalMiddleware(), getInternalRouter());
  router.use('/webhook', getWebhookRouter());

  router.get(
    '/',
    Wrapper(async (_req, res) => {
      res.json({
        opcode: OPCODE.SUCCESS,
        mode: process.env.NODE_ENV,
        cluster: hostname,
      });
    })
  );

  router.all(
    '*',
    Wrapper(async () => {
      throw new InternalError('Invalid API', 404);
    })
  );

  return router;
}
