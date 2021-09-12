import { Router } from 'express';
import { OPCODE, Webhook, Wrapper } from '..';

export function getWebhookRouter(): Router {
  const router = Router();

  router.post(
    '/payment',
    Wrapper(async (req, res) => {
      await Webhook.onPayment(req.body);
      res.json({ opcode: OPCODE.SUCCESS });
    })
  );

  router.post(
    '/refund',
    Wrapper(async (req, res) => {
      await Webhook.onRefund(req.body);
      res.json({ opcode: OPCODE.SUCCESS });
    })
  );

  return router;
}
