import got, { Got } from 'got';

let client: Got | null;

export function getPlatformClient(): Got {
  if (client) return client;
  const {
    HIKICK_PLATFORM_URL,
    HIKICK_PLATFORM_ACCESS_KEY_ID,
    HIKICK_PLATFORM_SECRET_ACCESS_KEY,
  } = process.env;
  if (
    !HIKICK_PLATFORM_URL ||
    !HIKICK_PLATFORM_ACCESS_KEY_ID ||
    !HIKICK_PLATFORM_SECRET_ACCESS_KEY
  ) {
    throw new Error('플랫폼 인증 정보가 없습니다.');
  }

  client = got.extend({
    prefixUrl: `${HIKICK_PLATFORM_URL}/v1`,
    headers: {
      'X-HIKICK-PLATFORM-ACCESS-KEY-ID': HIKICK_PLATFORM_ACCESS_KEY_ID,
      'X-HIKICK-PLATFORM-SECRET-ACCESS-KEY': HIKICK_PLATFORM_SECRET_ACCESS_KEY,
    },
    hooks: {
      beforeError: [
        (err: any): any => {
          if (!err.response || !err.response.body) return err;
          const { opcode, message } = JSON.parse(<string>err.response.body);

          err.name = 'InternalError';
          err.opcode = opcode;
          err.message = message;
          return err;
        },
      ],
    },
  });

  return client;
}
