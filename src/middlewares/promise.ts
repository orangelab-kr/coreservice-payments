import { promisify } from 'util';
import { Callback, Wrapper } from '..';

export function PromiseMiddleware(...callbacks: Callback[]): Callback {
  return Wrapper(async (req, res, next) => {
    await Promise.all(
      callbacks.map((callback) => promisify(callback)(req, res))
    );

    next();
  });
}
