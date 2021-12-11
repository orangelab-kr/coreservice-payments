import { RecordModel } from '@prisma/client';
import { Coupon, CouponGroup } from '.';
import * as Sentry from '@sentry/node';
import { Card, logger } from '..';
import {
  $$$,
  getCoreServiceClient,
  getPlatformClient,
  Record,
  RecordProperties,
  RESULT,
  UserModel,
} from '..';

interface Payment {
  paymentId: string;
  description: string;
  platformId: string;
  franchiseId: string;
  paymentType: string;
  amount: number;
  rideId: string;
  refundedAt: null;
  processedAt: null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  ride: {
    rideId: string;
    kickboardCode: string;
    platformId: string;
    franchiseId: string;
    regionId: string;
    discountGroupId: null;
    discountId: null;
    insuranceId: string;
    userId: string;
    realname: string;
    phone: string;
    birthday: string;
    photo: null;
    startedAt: string;
    startedPhoneLocationId: string;
    startedKickboardLocationId: string;
    terminatedAt: null;
    terminatedType: null;
    terminatedPhoneLocationId: null;
    terminatedKickboardLocationId: null;
    receiptId: null;
    price: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: null;
    startedPhoneLocation: {
      locationId: string;
      latitude: number;
      longitude: number;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: null;
    };
    startedKickboardLocation: {
      locationId: string;
      latitude: number;
      longitude: number;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: null;
    };
    terminatedPhoneLocation: null;
    terminatedKickboardLocation: null;
    receipt: null;
  };
}

export interface WebhookPayment {
  requestId: string;
  webhookId: string;
  data: {
    payment: Payment;
  };
  completedAt: null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  webhook: {
    webhookId: string;
    type: string;
    platformId: string;
    url: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: null;
  };
}

export interface WebhookRefund {
  requestId: string;
  webhookId: string;
  data: {
    payment: Payment;
    reason?: string;
    amount?: number;
  };
  completedAt: null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  webhook: {
    webhookId: string;
    type: string;
    platformId: string;
    url: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: null;
  };
}

export class Webhook {
  public static async getFranchise(franchiseId: string): Promise<any> {
    try {
      const { franchise } = await getPlatformClient()
        .get(`franchise/platform/franchises/${franchiseId}`)
        .json();

      if (!franchise) return null;
      return franchise;
    } catch (err: any) {
      return null;
    }
  }

  public static async onPayment(payload: WebhookPayment): Promise<void> {
    const { payment } = payload.data;
    const [ride, beforeRecord, user] = await Promise.all([
      Record.getRideByOpenAPIRideId(payment.rideId),
      Record.getRecordByOpenApiPaymentId(payment.paymentId),
      getCoreServiceClient('accounts')
        .get(`users/${payment.ride.userId}`)
        .json<{ user: UserModel }>()
        .then(({ user }) => user),
    ]);

    if (beforeRecord) throw RESULT.SUCCESS({ details: { alreadyPaid: true } });
    const { userId } = user;
    const { rideId, kickboardCode } = ride;
    const { franchiseId } = payment;
    const properties: RecordProperties = {
      coreservice: { rideId },
      openapi: <any>{ ...payment, ride: undefined },
    };

    let abbrevation = '미';
    if (payment.ride.discountId) {
      const { discountId } = payment.ride;
      const coupon = await Coupon.getCouponByOpenApiOrThrow(discountId);
      abbrevation = coupon.couponGroup.abbreviation || '선';
    }

    const franchise = await Webhook.getFranchise(franchiseId);
    const paymentKeyId = franchise ? franchise.paymentKeyId : null;
    const name = franchise ? franchise.name : '미지정';
    const type = payment.paymentType === 'SERVICE' ? '이용료' : '추가금';
    const recordName = `${name}(${abbrevation}) / ${type}(${kickboardCode})`;
    const record: RecordModel = await $$$(
      Record.createThenPayRecord({
        paymentKeyId,
        userId: user.userId,
        amount: payment.amount,
        name: recordName,
        description: payment.description,
        required: false,
        properties,
      })
    );

    await Record.setOpenApiProcessed(record);
    await Record.updateRidePrice(ride).catch(() => null);

    try {
      const { amount, cardId } = record;
      if (record.processedAt && cardId) {
        const { cardName } = await Card.getCardOrThrow(user, cardId);
        await getCoreServiceClient('accounts').post({
          url: `users/${userId}/notifications`,
          json: {
            type: 'info',
            title: `🧾 ${recordName} ${amount.toLocaleString()}원 / 결제 완료`,
            description: `${cardName} 카드로 ${type} 결제를 성공하였습니다.`,
          },
        });
      } else {
        await getCoreServiceClient('accounts').post({
          url: `users/${userId}/notifications`,
          json: {
            type: 'info',
            title: `🧾 ${recordName} ${amount.toLocaleString()}원 / 결제 실패`,
            description: `${type} 결제를 실패하였습니다. 결제 내역에서 결제를 완료해주세요.`,
          },
        });
      }
    } catch (err) {
      const errorId = Sentry.captureException(err);
      logger.error(`결제 / 안내 푸시를 발송하지 못했습니다. (${errorId})`);
    }
  }

  public static async onRefund(payload: WebhookRefund): Promise<void> {
    const { payment, reason, amount } = payload.data;
    const ride = await Record.getRideByOpenAPIRideId(payment.ride.rideId);
    const user = await getCoreServiceClient('accounts')
      .get(`users/${ride.userId}`)
      .json<{ user: UserModel }>()
      .then(({ user }) => user);

    const { userId } = user;
    const { paymentId } = payment;
    const record = await Record.getRecordByPaymentIdOrThrow(user, paymentId);
    await $$$(Record.refundRecord(record, { amount, reason }));
    await Record.setOpenApiProcessed(record);
    await Record.updateRidePrice(ride).catch(() => null);

    try {
      const { name, amount } = record;
      await getCoreServiceClient('accounts').post({
        url: `users/${userId}/notifications`,
        json: {
          type: 'info',
          title: `🧾 ${name} ${amount.toLocaleString()}원 / 결제 환불`,
          description: `결제하신 내역이 환불 처리되었습니다.`,
        },
      });
    } catch (err) {
      const errorId = Sentry.captureException(err);
      logger.error(`환불 / 안내 푸시를 발송하지 못했습니다. (${errorId})`);
    }
  }
}
