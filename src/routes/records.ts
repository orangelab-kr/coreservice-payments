import { Router } from 'express';
import { $$$, Record, RecordMiddleware, RESULT, Wrapper } from '..';

export function getRecordsRouter(): Router {
  const router = Router();

  router.get(
    '/',
    Wrapper(async (req) => {
      const { query, user } = req;
      const { total, records } = await Record.getRecords(user, query);
      throw RESULT.SUCCESS({ details: { records, total } });
    })
  );

  router.get(
    '/:recordId',
    RecordMiddleware(),
    Wrapper(async (req) => {
      const { record } = req;
      throw RESULT.SUCCESS({ details: { record } });
    })
  );

  router.get(
    '/:recordId/retry',
    RecordMiddleware(),
    Wrapper(async (req) => {
      const { record, user } = req;
      await $$$(Record.retryPayment(user, record));
      throw RESULT.SUCCESS();
    })
  );

  return router;
}
