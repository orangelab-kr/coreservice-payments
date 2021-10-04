import { promisify } from 'util';
import { WrapperCallback, Wrapper } from '..';

export function PromiseMiddleware(
  ...callbacks: WrapperCallback[]
): WrapperCallback {
  return Wrapper(async (req, res, next) => {
    await Promise.all(
      callbacks.map((callback) => promisify(callback)(req, res))
    );

    next();
  });
}
