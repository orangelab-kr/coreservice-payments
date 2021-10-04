import { Card, RESULT, Wrapper, WrapperCallback } from '..';

export function CardMiddleware(showBillingKey = false): WrapperCallback {
  return Wrapper(async (req, res, next) => {
    const {
      user,
      params: { cardId },
    } = req;

    if (!user || typeof cardId !== 'string') throw RESULT.CANNOT_FIND_CARD();
    req.card = await Card.getCardOrThrow(user, cardId, showBillingKey);
    next();
  });
}
