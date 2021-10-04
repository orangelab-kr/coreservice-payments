import { Record, RESULT, Wrapper, WrapperCallback } from '../..';

export function InternalRecordMiddleware(): WrapperCallback {
  return Wrapper(async (req, res, next) => {
    const {
      internal: { user },
      params: { recordId },
    } = req;

    if (!user || typeof recordId !== 'string') {
      throw RESULT.CANNOT_FIND_RECORD();
    }

    req.internal.record = await Record.getRecordOrThrow(user, recordId);
    next();
  });
}
