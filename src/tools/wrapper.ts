import * as Sentry from '@sentry/node';

import { NextFunction, Request, Response } from 'express';
import { OPCODE, logger } from '..';

import { ValidationError } from 'joi';

export type Callback = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export function Wrapper(cb: Callback): Callback {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      return await cb(req, res, next);
    } catch (err) {
      if (process.env.NODE_ENV !== 'prod') {
        logger.error(err.message);
        logger.error(err.stack);
      }

      let status = 500;
      let opcode = OPCODE.ERROR;
      let message = '알 수 없는 오류가 발생했습니다.';
      const eventId = Sentry.captureException(err);
      let details;

      if (err.name === 'InternalError') {
        opcode = err.opcode;
        message = err.message;
        details = err.details;
      }

      if (err instanceof ValidationError) {
        status = 400;
        message = '올바른 정보를 입력해주세요.';
        details = err.details;
      }

      res.status(status).json({
        opcode,
        eventId,
        message,
        details,
      });
    }
  };
}
