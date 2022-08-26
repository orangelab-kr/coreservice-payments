import { Router } from 'express';
import { $$$, InternalRecordMiddleware, Record, RESULT, Wrapper } from '../..';

export function getInternalRecordsRouter(): Router {
  const router = Router();

  router.get(
    '/',
    Wrapper(async (req) => {
      const { query } = req;
      const { records, total } = await Record.getRecords(query);
      throw RESULT.SUCCESS({ details: { records, total } });
    })
  );

  router.post(
    '/',
    Wrapper(async (req) => {
      const { body } = req;
      const record = await $$$(Record.createThenPayRecord(body));
      throw RESULT.SUCCESS({ details: { record } });
    })
  );

  router.get(
    '/:recordId',
    InternalRecordMiddleware(),
    Wrapper(async (req) => {
      const { record } = req.internal;
      throw RESULT.SUCCESS({ details: { record } });
    })
  );

  router.get(
    '/:recordId/retry',
    InternalRecordMiddleware(),
    Wrapper(async (req) => {
      const { record, user } = req.internal;
      await $$$(Record.retryPayment(user, record));
      throw RESULT.SUCCESS();
    })
  );

  router.post(
    '/:recordId/refund',
    InternalRecordMiddleware(),
    Wrapper(async (req) => {
      const { body, internal } = req;
      const record = await Record.refundRecord(internal.record, body);
      throw RESULT.SUCCESS({ details: { record } });
    })
  );

  return router;
}
