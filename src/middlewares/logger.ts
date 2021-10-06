import { WrapperCallback, logger, Wrapper } from '..';

export function LoggerMiddleware(): WrapperCallback {
  return Wrapper(async (req, res, next) => {
    const startedAt = Date.now();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const httpVersion = `HTTP/${req.httpVersionMajor}.${req.httpVersionMinor}`;
    const userAgent = req.headers['user-agent'];
    const ipAddress =
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress;

    res.on('finish', () => {
      const statusCode = res.statusCode;
      const contentLength = `${res.getHeader('content-length') || 0}B`;
      const time = `${Date.now() - startedAt}ms`;

      if (process.env.NODE_ENV === 'prod') {
        logger.info(
          `[${httpVersion}] ${method} ${url} - ${time}\
(SC: ${statusCode}, IP: "${ipAddress}", UA: "${userAgent}", CL: ${contentLength})`
        );
      } else {
        logger.info(`${httpVersion} / ${method} ${url} - ${time}`);
        logger.info(`- Status Code: ${statusCode}`);
        logger.info(`- IP Address: ${ipAddress}`);
        logger.info(`- User Agent: ${userAgent}`);
        logger.info(`- Content Length: ${contentLength}`);
      }
    });

    next();
  });
}
