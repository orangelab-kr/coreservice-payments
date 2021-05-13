import { Router } from 'express';
import { Jtnet, OPCODE, Wrapper } from '..';

export function getLegacyRouter(): Router {
  const router = Router();

  router.post(
    '/generate',
    Wrapper(async (req, res) => {
      const { billingKey, cardName } = await Jtnet.createBillingKey(req.body);
      res.json({ opcode: OPCODE.SUCCESS, billingKey, cardName });
    })
  );

  router.post(
    '/invoke',
    Wrapper(async (req, res) => {
      const tid = await Jtnet.invokeBilling(req.body);
      res.json({ opcode: OPCODE.SUCCESS, tid });
    })
  );

  return router;
}
