import { Router } from 'express';
import { RESULT, Webhook, Wrapper } from '..';

export function getWebhookRouter(): Router {
  const router = Router();

  router.post(
    '/payment',
    Wrapper(async (req) => {
      await Webhook.onPayment(req.body);
      throw RESULT.SUCCESS();
    })
  );

  router.post(
    '/refund',
    Wrapper(async (req) => {
      await Webhook.onRefund(req.body);
      throw RESULT.SUCCESS();
    })
  );

  return router;
}
