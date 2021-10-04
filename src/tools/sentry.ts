import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Application } from 'express';
import { logger } from '.';

export function registerSentry(app: Application): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.warn('Sentry / 활성화 할 수 없습니다.');
    return;
  }

  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app }),
    ],
  });

  app.use(Sentry.Handlers.errorHandler());
  logger.info(`Sentry / 활성화되었습니다. (DSN: ${dsn})`);
}
