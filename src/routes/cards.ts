import { Router } from 'express';
import { $$$, Card, CardMiddleware, OPCODE, Wrapper } from '..';

export function getCardsRouter(): Router {
  const router = Router();

  router.get(
    '/',
    Wrapper(async (req, res) => {
      const cards = await $$$(Card.getCards(req.user));
      res.json({ opcode: OPCODE.SUCCESS, cards });
    })
  );

  router.post(
    '/',
    Wrapper(async (req, res) => {
      const card = await $$$(Card.registerCard(req.user, req.body));
      res.json({ opcode: OPCODE.SUCCESS, card });
    })
  );

  router.post(
    '/orderBy',
    Wrapper(async (req, res) => {
      await Card.reorderCard(req.user, req.body);
      res.json({ opcode: OPCODE.SUCCESS });
    })
  );

  router.delete(
    '/:cardId',
    CardMiddleware(true),
    Wrapper(async (req, res) => {
      await Card.checkReady(req.user);
      const card = await Card.revokeCard(req.user, req.card);
      res.json({ opcode: OPCODE.SUCCESS, card });
    })
  );

  return router;
}
