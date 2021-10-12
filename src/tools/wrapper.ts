import * as Sentry from '@sentry/node';
import { NextFunction, Request, Response } from 'express';
import i18n from 'i18n';
import { logger, RESULT } from '.';

i18n.configure({
  defaultLocale: 'en',
  locales: ['en', 'ko'],
  directory: 'locales',
  queryParameter: 'lang',
  updateFiles: false,
});

export type WrapperCallback = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export type WrapperResultProps = WrapperResultLazyProps & {
  opcode?: number;
  statusCode?: number;
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
    this.opcode = props.opcode || 0;
    this.statusCode = props.statusCode || 200;
    this.reportable = props.reportable || false;
    this.details = props.details || {};
    this.args = props.args || [];
    this.res = props.res;

    if (props.message) this.message = props.message;
  }
}

export function Wrapper(cb: WrapperCallback): WrapperCallback {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      return await cb(req, res, next);
    } catch (err: any) {
      let eventId: string | undefined;
      let result: WrapperResult | undefined;

      if (err.name === 'Result') result = err;
      if (err.name === 'ValidationError') {
        const { details } = err;
        result = RESULT.FAILED_VALIDATE({ details: { details } });
      }

      if (!result) {
        if (process.env.NODE_ENV !== 'prod') {
          logger.error(err.message);
          logger.error(err.stack);
        }

        result = RESULT.INVALID_ERROR();
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
    }
  };
}
