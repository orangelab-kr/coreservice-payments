import got, { Got } from 'got';
import jwt from 'jsonwebtoken';

let client: Got | null;
let accessKey: string | null;

function getAccountsToken(props: {
  iss: string;
  aud: string;
  secretKey: string;
}): string {
  const { iss, aud, secretKey } = props;
  if (accessKey) {
    try {
      const opts = { json: true };
      const decodedPayload: any = jwt.decode(accessKey, opts);
      if (decodedPayload.exp * 1000 > Date.now()) return accessKey;
    } catch (err) {}
  }

  const sub = 'coreservice-accounts';
  const options = { expiresIn: '1h' };
  const token = jwt.sign({ sub, iss, aud }, secretKey, options);
  accessKey = token;
  return token;
}

export function getAccountsClient(): Got {
  if (client) return client;
  const {
    HIKICK_CORESERVICE_PAYMENTS_URL,
    HIKICK_CORESERVICE_ACCOUNTS_URL,
    HIKICK_CORESERVICE_ACCOUNTS_KEY,
  } = process.env;
  if (
    !HIKICK_CORESERVICE_PAYMENTS_URL ||
    !HIKICK_CORESERVICE_ACCOUNTS_URL ||
    !HIKICK_CORESERVICE_ACCOUNTS_KEY
  ) {
    throw new Error('계정 서비스 인증 정보가 없습니다.');
  }

  client = got.extend({
    prefixUrl: `${HIKICK_CORESERVICE_ACCOUNTS_URL}/internal`,
    hooks: {
      beforeRequest: [
        (opts) => {
          getAccountsToken({
            aud: 'system@hikick.kr',
            iss: HIKICK_CORESERVICE_PAYMENTS_URL,
            secretKey: HIKICK_CORESERVICE_ACCOUNTS_KEY,
          });

          opts.headers['Authorization'] = `Bearer ${accessKey}`;
        },
      ],
      beforeError: [
        (err: any): any => {
          if (!err.response || !err.response.body) return err;
          const { opcode, message } = JSON.parse(<string>err.response.body);

          err.name = 'InternalError';
          err.opcode = opcode;
          err.message = message;
          return err;
        },
        },
      ],
    },
  });

  return client;
}
