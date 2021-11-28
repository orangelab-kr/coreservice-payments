import { Card, RESULT, Wrapper, WrapperCallback } from '../..';

export function InternalCardMiddleware(): WrapperCallback {
  return Wrapper(async (req, res, next) => {
    const {
      internal: { user },
      params: { cardId },
    } = req;

    if (!user || !cardId) throw RESULT.CANNOT_FIND_CARD();
    const card = await Card.getCardOrThrow(user, cardId, true);
    req.internal.card = card;

    next();
  });
}
