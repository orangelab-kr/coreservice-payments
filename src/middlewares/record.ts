import { Record, RESULT, Wrapper, WrapperCallback } from '..';

export function RecordMiddleware(): WrapperCallback {
  return Wrapper(async (req, res, next) => {
    const {
      user,
      params: { recordId },
    } = req;

    if (!user || typeof recordId !== 'string') {
      throw RESULT.CANNOT_FIND_RECORD();
    }

    req.record = await Record.getRecordOrThrow(recordId, user);
    next();
  });
}
