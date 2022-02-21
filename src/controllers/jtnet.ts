import { PaymentKeyModel, RecordModel } from '@prisma/client';
import dayjs from 'dayjs';
import got, { Got } from 'got';
import { Joi, prisma, RESULT } from '..';

export class Jtnet {
  private static client?: Got;

  public static async getPaymentKey(
    paymentKeyId: string
  ): Promise<PaymentKeyModel> {
    const paymentKey = await prisma.paymentKeyModel.findFirst({
      where: { paymentKeyId },
    });

    if (!paymentKey) throw RESULT.CANNOT_FIND_PAYMENT_PROVIDER();
    return paymentKey;
  }

  public static async getPrimaryPaymentKey(): Promise<PaymentKeyModel> {
    const paymentKey = await prisma.paymentKeyModel.findFirst({
      where: { primary: true },
    });

    if (!paymentKey) throw RESULT.CANNOT_FIND_PAYMENT_PROVIDER();
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
    paymentKeyId?: string | undefined;
  }): Promise<string> {
    const schema = Joi.object({
      billingKey: Joi.string().required(),
      productName: Joi.string().optional(),
      amount: Joi.number().required(),
      realname: Joi.string().allow('').required(),
      phone: Joi.string().allow('').required(),
      paymentKeyId: Joi.string().uuid().optional(),
    });

    const client = this.getClient();
    const { billingKey, productName, amount, realname, phone, paymentKeyId } =
      await schema.validateAsync(props);
    // Legacy 대응 -> 추후에는 무조건 PaymentKey 는 Required 임
    const primaryPaymentKey = await this.getPrimaryPaymentKey();

    let paymentKey = primaryPaymentKey;
    if (paymentKeyId) paymentKey = await this.getPaymentKey(paymentKeyId);

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
      throw RESULT.FAILED_PAYMENT({ args: [res.result_msg] });
    }

    return res.tid;
  }

  public static async refundBilling(props: {
    tid: string;
    reason?: string;
    amount?: number;
    paymentKeyId?: string;
    isParticalCancel?: boolean;
  }): Promise<void> {
    const schema = Joi.object({
      tid: Joi.string().required(),
      reason: Joi.string().optional(),
      amount: Joi.number().optional(),
      paymentKeyId: Joi.string().uuid().optional(),
      isParticalCancel: Joi.boolean().default(false).optional(),
    });

    const { tid, reason, amount, paymentKeyId, isParticalCancel } =
      await schema.validateAsync(props);

    const client = this.getClient();
    // Legacy 대응 -> 추후에는 무조건 PaymentKey 는 Required 임
    const primaryPaymentKey = await this.getPrimaryPaymentKey();
    let paymentKey = primaryPaymentKey;
    if (paymentKeyId) paymentKey = await this.getPaymentKey(paymentKeyId);
    const { identity, secretKey } = paymentKey;
    const res = await client
      .post({
        url: 'refunds',
        form: {
          cancel_pw: '0000',
          cancel_amt: amount,
          cancel_msg: reason && reason.substring(0, 100),
          partial_cancel: isParticalCancel ? 1 : 0,
          mid: identity,
          api_key: secretKey,
          tid,
        },
      })
      .json<any>();

    if (!['2001', '2013'].includes(res.result_cd)) {
      throw RESULT.CANNOT_REFUND_RECORD({ args: [res.result_msg] });
    }
  }

  public static async refundBillingByRecord(
    record: RecordModel,
    props: { reason?: string; amount?: number }
  ): Promise<void> {
    const { paymentKeyId, tid } = record;
    const amount = props.amount || record.amount;
    if (!tid || !paymentKeyId) throw RESULT.NOT_PAIED_RECORD();
    const reason = props.reason && props.reason.substring(0, 100);
    const isParticalCancel =
      (props.amount && props.amount !== record.initialAmount) ||
      !!record.refundedAt;

    return this.refundBilling({
      tid,
      reason,
      amount,
      paymentKeyId,
      isParticalCancel,
    });
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
      throw RESULT.CANNOT_DELETE_BILLING_KEY({ args: [res.result_msg] });
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
      throw RESULT.CARD_IS_NOT_VALID({ args: [res.result_msg] });
    }

    const cardNum = res.card_num.substr(res.card_num.length - 4);
    return {
      billingKey: res.card_token,
      cardName: `${res.card_name}(${cardNum})`,
    };
  }
}
