import { Router } from 'express';
import { Webhook } from '../controllers';
import { OPCODE, Wrapper } from '../tools';

export function getWebhookRouter() {
  const router = Router();

  router.post(
    '/payment',
    Wrapper(async (req, res) => {
      await Webhook.onPayment(req.body);
      res.json({ opcode: OPCODE.SUCCESS });
    })
  );

  return router;
}
