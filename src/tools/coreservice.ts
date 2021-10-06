import { Request } from 'express';
import got, {
  BeforeErrorHook,
  BeforeRequestHook,
  Got,
  RequestError,
} from 'got';
import jwt from 'jsonwebtoken';
import { RESULT, WrapperResult } from '.';

const retry = 0;
const email = 'system@hikick.kr';
const issuer = process.env.HIKICK_CORESERVICE_PAYMENTS_KEY;
const tokens: { [key: string]: string } = {};
const services: { [key: string]: Got } = {};

function getServiceSecretKey(service: string): string {
  service = service.toUpperCase();
  const secretKey = process.env[`HIKICK_CORESERVICE_${service}_KEY`];
  if (!secretKey) throw RESULT.INVALID_ERROR();
  return secretKey;
}

function getServiceURL(service: string): string {
  service = service.toUpperCase();
  const url = process.env[`HIKICK_CORESERVICE_${service}_URL`];
  if (!url) throw RESULT.INVALID_ERROR();
  return `${url}/internal`;
}

function getAccessToken(service: string): string {
  if (tokens[service]) {
    try {
      const opts = { json: true };
      const decodedPayload: any = jwt.decode(tokens[service], opts);
      if (decodedPayload.exp * 1000 > Date.now()) return tokens[service];
    } catch (err: any) {}
  }

  const options = { expiresIn: '1h' };
  const subject = `coreservice-${service}`;
  const secretKey = getServiceSecretKey(service);
  const payload = { sub: subject, iss: issuer, aud: email };
  const token = jwt.sign(payload, secretKey, options);
  tokens[service] = token;
  return token;
}

export function getCoreServiceClient(service: string, req?: Request): Got {
  if (services[service]) return services[service];
  const prefixUrl = getServiceURL(service);
  const onBeforeRequest: BeforeRequestHook = (opts) => {
    const accessToken = getAccessToken(service);
    opts.headers['Authorization'] = `Bearer ${accessToken}`;
  };

  const onBeforeError: BeforeErrorHook = (err) => {
    if (!err.response) return;
    const { message } = err;
    const { statusCode, body } = err.response;
    const details = JSON.parse(<string>body);
    const result = new WrapperResult({ statusCode, message, details });
    const obj = Object.setPrototypeOf(result, RequestError.prototype);
    return obj;
  };

  const client = got.extend({
    retry,
    prefixUrl,
    hooks: {
      beforeRequest: [onBeforeRequest],
      beforeError: [onBeforeError],
    },
  });

  services[service] = client;
  return client;
}
