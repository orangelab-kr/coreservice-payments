import got from 'got';

export async function sendMessageWithMessageGateway(props: {
  phone: string;
  name: string;
  fields: any;
}): Promise<void> {
  const {
    MESSAGE_GATEWAY_URL,
    MESSAGE_GATEWAY_ACCESS_KEY_ID,
    MESSAGE_GATEWAY_SECRET_ACCESS_KEY,
  } = process.env;

  await got({
    method: 'POST',
    url: `${MESSAGE_GATEWAY_URL}/send`,
    json: props,
    headers: {
      'X-MESSAGE-GATEWAY-ACCESS-KEY-ID': MESSAGE_GATEWAY_ACCESS_KEY_ID,
      'X-MESSAGE-GATEWAY-SECRET-ACCESS-KEY': MESSAGE_GATEWAY_SECRET_ACCESS_KEY,
    },
  }).json();
}
