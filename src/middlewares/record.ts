import { Callback, InternalError, OPCODE, Record, Wrapper } from '..';

export function RecordMiddleware(): Callback {
  return Wrapper(async (req, res, next) => {
    const {
      user,
      params: { recordId },
    } = req;
    if (!user || typeof recordId !== 'string') {
      throw new InternalError(
        '결제 내역을 찾을 수 없습니다.',
        OPCODE.NOT_FOUND
      );
    }

    req.record = await Record.getRecordOrThrow(user, recordId);
    next();
  });
}
