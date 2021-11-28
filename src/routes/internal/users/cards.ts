import { Router } from 'express';
import { $$$, Card, CardMiddleware, RESULT, Wrapper } from '../../..';
import { InternalCardMiddleware } from '../../../middlewares/internal/card';

export function getInternalUsersCardsRouter(): Router {
  const router = Router();

  router.get(
    '/',
    Wrapper(async (req) => {
      const cards = await $$$(Card.getCards(req.internal.user));
      throw RESULT.SUCCESS({ details: { cards } });
    })
  );

  router.get(
    '/:cardId',
    InternalCardMiddleware(),
    Wrapper(async (req) => {
      const { card } = req.internal;
      throw RESULT.SUCCESS({ details: { card } });
    })
  );

  router.post(
    '/',
    Wrapper(async (req) => {
      const card = await $$$(Card.registerCard(req.internal.user, req.body));
      throw RESULT.SUCCESS({ details: { card } });
    })
  );

  router.post(
    '/orderBy',
    Wrapper(async (req) => {
      await Card.reorderCard(req.internal.user, req.body);
      throw RESULT.SUCCESS();
    })
  );

  router.delete(
    '/:cardId',
    InternalCardMiddleware(),
    Wrapper(async (req) => {
      await Card.checkReady(req.user);
      const card = await Card.revokeCard(req.internal.user, req.internal.card);
      throw RESULT.SUCCESS({ details: { card } });
    })
  );

  return router;
}
