import { Router } from 'express';
import { Jtnet, RESULT, Wrapper } from '..';

export function getDirectRouter(): Router {
  const router = Router();

  router.post(
    '/generate',
    Wrapper(async (req) => {
      const { billingKey, cardName } = await Jtnet.createBillingKey(req.body);
      throw RESULT.SUCCESS({ details: { billingKey, cardName } });
    })
  );

  router.post(
    '/invoke',
    Wrapper(async (req) => {
      const tid = await Jtnet.invokeBilling(req.body);
      throw RESULT.SUCCESS({ details: { tid } });
    })
  );

  router.post(
    '/cancel',
    Wrapper(async (req) => {
      await Jtnet.refundBilling(req.body);
      throw RESULT.SUCCESS();
    })
  );

  return router;
}
