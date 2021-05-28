import { Callback, Card, InternalError, OPCODE, Wrapper } from '..';

export function CardMiddleware(): Callback {
  return Wrapper(async (req, res, next) => {
    const {
      user,
      params: { cardId },
    } = req;
    if (!user || typeof cardId !== 'string') {
      throw new InternalError('카드를 찾을 수 없습니다.', OPCODE.NOT_FOUND);
    }

    req.card = await Card.getCardOrThrow(user, cardId);
    next();
  });
}
