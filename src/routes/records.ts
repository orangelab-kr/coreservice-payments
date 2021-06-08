import { Router } from 'express';
import { OPCODE, Record, RecordMiddleware, Wrapper, $$$ } from '..';

export function getRecordsRouter() {
  const router = Router();

  router.get(
    '/',
    Wrapper(async (req, res) => {
      const { query, user } = req;
      const { total, records } = await Record.getRecords(user, query);
      res.json({ opcode: OPCODE.SUCCESS, records, total });
    })
  );

  router.get(
    '/:recordId',
    RecordMiddleware(),
    Wrapper(async (req, res) => {
      const { record } = req;
      res.json({ opcode: OPCODE.SUCCESS, record });
    })
  );

  router.get(
    '/:recordId/retry',
    RecordMiddleware(),
    Wrapper(async (req, res) => {
      const { record, user } = req;
      await $$$(Record.retryPayment(user, record));
      res.json({ opcode: OPCODE.SUCCESS });
    })
  );

  return router;
}
