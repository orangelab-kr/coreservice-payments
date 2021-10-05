import * as Sentry from '@sentry/node';
import { NextFunction, Request, Response } from 'express';
import i18n from 'i18n';
import { ValidationError } from 'joi';
import { logger, RESULT } from '.';

i18n.configure({
  defaultLocale: 'en',
  locales: ['en', 'ko'],
  directory: 'locales',
  updateFiles: false,
});

export type WrapperCallback = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export type WrapperResultProps = WrapperResultLazyProps & {
  opcode: number;
  statusCode: number;
  message?: string;
  reportable?: boolean;
  details?: any;
  args?: string[];
  res?: Response;
};

export interface WrapperResultLazyProps {
  details?: any;
  args?: string[];
  res?: Response;
}

export class WrapperResult extends Error {
  public name = 'Result';
  public opcode: number;
  public statusCode: number;
  public reportable: boolean;
  public details: any;
  public args: string[];
  public res?: Response;

  public constructor(props: WrapperResultProps) {
    super();
    this.opcode = props.opcode;
    this.statusCode = props.statusCode || 500;
    this.reportable = props.reportable || false;
    this.details = props.details || {};
    this.args = props.args || [];
    this.res = props.res;

    if (props.message) this.message = props.message;
  }
}

export function Wrapper(cb: WrapperCallback): WrapperCallback {
  return async (req: Request, res: Response, next: NextFunction) => {
    return cb(req, res, next).catch((err) => {
      let eventId: string | undefined;
      let result: WrapperResult;

      if (err instanceof WrapperResult) {
        result = err;
      } else {
        if (process.env.NODE_ENV !== 'prod') {
          logger.error(err.message);
          logger.error(err.stack);
        }

        result = RESULT.INVALID_ERROR();
      }

      if (err instanceof ValidationError) {
        const { details } = err;
        result = RESULT.FAILED_VALIDATE({ details: { details } });
      }

      const { statusCode, opcode, details, reportable, args } = result;
      const message = result.message
        ? res.__(result.message, ...args)
        : undefined;

      if (reportable) eventId = Sentry.captureException(err);
      if (res.headersSent) return;
      res.status(statusCode).json({
        opcode,
        eventId,
        message,
        ...details,
      });
    });
  };
}
