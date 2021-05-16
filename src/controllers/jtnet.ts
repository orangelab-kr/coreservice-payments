import { PaymentKeyModel } from '@prisma/client';
import dayjs from 'dayjs';
import got, { Got } from 'got';
import { Database, InternalError, Joi, OPCODE } from '../tools';

const { prisma } = Database;

export class Jtnet {
  private static client?: Got;

  public static async getPaymentKey(
    paymentKeyId: string
  ): Promise<PaymentKeyModel> {
    const paymentKey = await prisma.paymentKeyModel.findFirst({
      where: { paymentKeyId },
    });
    if (!paymentKey) {
      throw new InternalError(
        '해당 결제 제공자를 찾을 수 없습니다.',
        OPCODE.NOT_FOUND
      );
    }

    return paymentKey;
  }

  public static async getPrimaryPaymentKey(): Promise<PaymentKeyModel> {
    const paymentKey = await prisma.paymentKeyModel.findFirst({
      where: { primary: true },
    });

    if (!paymentKey) {
      throw new InternalError(
        '해당 결제 제공자를 찾을 수 없습니다.',
        OPCODE.NOT_FOUND
      );
    }

    return paymentKey;
  }

  private static getClient(): Got {
    if (this.client) return this.client;
    this.client = got.extend({
      prefixUrl: 'https://webtx.tpay.co.kr/api/v1',
    });

    return this.client;
  }

  public static async invokeBilling(props: {
    billingKey: string;
    amount: number;
    realname: string;
    phone: string;
  }): Promise<string> {
    const schema = Joi.object({
      billingKey: Joi.string().required(),
      amount: Joi.number().required(),
      realname: Joi.string().allow('').required(),
      phone: Joi.string().allow('').required(),
      paymentKeyId: Joi.string().uuid().required(),
    });

    const client = this.getClient();
    const {
      billingKey,
      amount,
      realname,
      phone,
      paymentKeyId,
    } = await schema.validateAsync(props);
    const [primaryPaymentKey, paymentKey] = await Promise.all([
      this.getPrimaryPaymentKey(),
      this.getPaymentKey(paymentKeyId),
    ]);

    const res = await client
      .post({
        url: 'payments_token',
        form: {
          mid: primaryPaymentKey.identity,
          api_key: primaryPaymentKey.secretKey,
          sub_mid: paymentKey.identity,
          sub_mid_key: paymentKey.secretKey,
          card_token: billingKey,
          amt: amount,
          buyer_name: realname,
          buyer_tel: phone,
        },
      })
      .json<any>();

    if (res.result_cd !== '0000') {
      throw new InternalError(
        `결제를 할 수 없습니다. ${res.result_msg}`,
        OPCODE.ERROR
      );
    }

    return res.tid;
  }

  public static async createBillingKey(props: {
    cardNumber: string;
    expiry: string;
    password: string;
    birthday: string;
  }): Promise<{ billingKey: string; cardName: string }> {
    const schema = Joi.object({
      cardNumber: Joi.string().length(16).required(),
      expiry: Joi.string().required(),
      password: Joi.string().length(2).required(),
      birthday: Joi.string().required(),
    });

    const client = this.getClient();
    const data = await schema.validateAsync(props);
    const { cardNumber, password, birthday } = data;
    const paymentKey = await this.getPrimaryPaymentKey();
    const expiry = data.expiry && dayjs(data.expiry).format('YYMM');
    const res = await client
      .post({
        url: 'gen_billkey',
        form: {
          mid: paymentKey.identity,
          api_key: paymentKey.secretKey,
          card_num: cardNumber,
          card_exp: expiry,
          card_pwd: password,
          buyer_auth_num: birthday,
        },
      })
      .json<any>();

    if (res.result_cd !== '0000') {
      throw new InternalError(
        `카드가 유효하지 않습니다. ${res.result_msg}`,
        OPCODE.ERROR
      );
    }

    return {
      billingKey: res.card_token,
      cardName: `${res.card_name} ${res.card_num}`,
    };
  }
}
