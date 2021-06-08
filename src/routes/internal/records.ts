import { Router } from 'express';
import { InternalRecordMiddleware, OPCODE, Record, Wrapper, $$$ } from '../..';

export function getInternalRecordsRouter() {
  const router = Router();

  router.get(
    '/',
    Wrapper(async (req, res) => {
      const {
        query,
        internal: { user },
      } = req;

      const { records, total } = await Record.getRecords(user, query);
      res.json({ opcode: OPCODE.SUCCESS, records, total });
    })
  );

  router.post(
    '/',
    Wrapper(async (req, res) => {
      const {
        body,
        internal: { user },
      } = req;

      const record = await $$$(Record.createThenPayRecord(user, body));
      res.json({ opcode: OPCODE.SUCCESS, record });
    })
  );

  router.get(
    '/:recordId',
    InternalRecordMiddleware(),
    Wrapper(async (req, res) => {
      const { record } = req.internal;
      res.json({ opcode: OPCODE.SUCCESS, record });
    })
  );

  router.get(
    '/:recordId/retry',
    InternalRecordMiddleware(),
    Wrapper(async (req, res) => {
      const { record, user } = req.internal;
      await $$$(Record.retryPayment(user, record));
      res.json({ opcode: OPCODE.SUCCESS });
    })
  );

  router.post(
    '/:recordId/refund',
    InternalRecordMiddleware(),
    Wrapper(async (req, res) => {
      const {
        body: { reason },
        internal: { record: beforeRecord },
      } = req;

      const record = await $$$(Record.refundRecord(beforeRecord, reason));
      res.json({ opcode: OPCODE.SUCCESS, record });
    })
  );

  return router;
}
