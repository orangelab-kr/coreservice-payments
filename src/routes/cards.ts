import { Router } from 'express';
import { $$$, Card, CardMiddleware, RESULT, Wrapper } from '..';

export function getCardsRouter(): Router {
  const router = Router();

  router.get(
    '/',
    Wrapper(async (req) => {
      const cards = await $$$(Card.getCards(req.user));
      throw RESULT.SUCCESS({ details: { cards } });
    })
  );

  router.post(
    '/',
    Wrapper(async (req) => {
      const card = await $$$(Card.registerCard(req.user, req.body));
      throw RESULT.SUCCESS({ details: { card } });
    })
  );

  router.post(
    '/orderBy',
    Wrapper(async (req) => {
      await Card.reorderCard(req.user, req.body);
      throw RESULT.SUCCESS();
    })
  );

  router.delete(
    '/:cardId',
    CardMiddleware(true),
    Wrapper(async (req) => {
      await Card.checkReady(req.user);
      const card = await Card.revokeCard(req.user, req.card);
      throw RESULT.SUCCESS({ details: { card } });
    })
  );

  return router;
}
