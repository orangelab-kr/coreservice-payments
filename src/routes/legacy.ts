import { Router } from 'express';
import { Jtnet, OPCODE, Wrapper } from '..';

export function getLegacyRouter(): Router {
  const router = Router();

  router.post(
    '/generate',
    Wrapper(async (req, res) => {
      const billingKey = await Jtnet.createBillingKey(req.body);
      res.json({ opcode: OPCODE.SUCCESS, billingKey });
    })
  );

  return router;
}
