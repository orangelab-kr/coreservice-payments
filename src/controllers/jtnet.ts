import { PaymentKeyModel, RecordModel } from '@prisma/client';
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
    productName: string;
    amount: number;
    realname: string;
    phone: string;
  }): Promise<string> {
    const schema = Joi.object({
      billingKey: Joi.string().required(),
      productName: Joi.string().optional(),
      amount: Joi.number().required(),
      realname: Joi.string().allow('').required(),
      phone: Joi.string().allow('').required(),
      paymentKeyId: Joi.string().uuid().required(),
    });

    const client = this.getClient();
    const { billingKey, productName, amount, realname, phone, paymentKeyId } =
      await schema.validateAsync(props);
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
          goods_nm: productName,
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

  public static async refundBilling(record: RecordModel): Promise<void> {
    const client = this.getClient();
    const { paymentKeyId, amount, tid } = record;
    const { identity, secretKey } = await this.getPaymentKey(paymentKeyId);
    const res = await client
      .post({
        url: 'refunds',
        form: {
          cancel_pw: '0000',
          cancel_amt: amount,
          mid: identity,
          api_key: secretKey,
          partial_cancel: 0,
          tid,
        },
      })
      .json<any>();

    if (!['0000', '2013'].includes(res.result_cd)) {
      throw new InternalError(`결제를 취소할 수 없습니다. ${res.result_msg}`);
    }
  }

  public static async revokeBilling(billingKey: string): Promise<void> {
    const client = this.getClient();
    const paymentKey = await this.getPrimaryPaymentKey();
    const res = await client
      .post({
        url: 'del_billkey',
        form: {
          mid: paymentKey.identity,
          api_key: paymentKey.secretKey,
          card_token: billingKey,
        },
      })
      .json<any>();

    if (res.result_cd !== '0000') {
      throw new InternalError(
        `카드를 만료시킬 수 없습니다. ${res.result_msg}`,
        OPCODE.ERROR
      );
    }
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
