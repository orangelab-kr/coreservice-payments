import { RecordModel } from '.prisma/client';
import { Card } from '.';
import {
  $$$,
  getCoreServiceClient,
  getPlatformClient,
  Record,
  RecordProperties,
  UserModel,
} from '..';

export interface WebhookPayment {
  requestId: string;
  webhookId: string;
  data: {
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
    paymentId: string;
    description: string;
    platformId: string;
    franchiseId: string;
    paymentType: string;
    amount: number;
    rideId: string;
    refundedAt: Date;
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
  public static async getFranchisePaymentKeyId(
    franchiseId: string
  ): Promise<string | null> {
    try {
      const { franchise } = await getPlatformClient()
        .get(`franchise/platform/franchises/${franchiseId}`)
        .json();

      if (!franchise) return null;
      return franchise.paymentKeyId;
    } catch (err: any) {
      return null;
    }
  }

  public static async onPayment(payload: WebhookPayment): Promise<void> {
    const { data } = payload;
    const [ride, user] = await Promise.all([
      Record.getRideByOpenAPIRideId(data.rideId),
      getCoreServiceClient('accounts')
        .get(`users/${data.ride.userId}`)
        .json<{ user: UserModel }>()
        .then(({ user }) => user),
    ]);

    const { userId } = user;
    const { rideId, kickboardCode } = ride;
    const { franchiseId } = data;
    const properties: RecordProperties = {
      coreservice: { rideId },
      openapi: <any>{ ...data, ride: undefined },
    };

    const type = data.paymentType === 'SERVICE' ? '이용료' : '추가금';
    const recordName = `${type}(${kickboardCode})`;
    const paymentKeyId = await Webhook.getFranchisePaymentKeyId(franchiseId);
    const record: RecordModel = await $$$(
      Record.createThenPayRecord({
        paymentKeyId,
        userId: user.userId,
        amount: data.amount,
        name: recordName,
        description: data.description,
        properties,
      })
    );

    const { amount, cardId } = record;
    await Record.setOpenApiProcessed(record);
    await Record.updateRidePrice(ride).catch(() => null);
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
  }

  public static async onRefund(payload: WebhookPayment): Promise<void> {
    const { data } = payload;
    const ride = await Record.getRideByOpenAPIRideId(data.ride.rideId);
    const user = await getCoreServiceClient('accounts')
      .get(`users/${ride.userId}`)
      .json<{ user: UserModel }>()
      .then(({ user }) => user);

    const { userId } = user;
    const record = await Record.getRecordByPaymentIdOrThrow(
      user,
      data.paymentId
    );

    await $$$(Record.refundRecord(record));
    await Record.setOpenApiProcessed(record);
    await Record.updateRidePrice(ride).catch(() => null);
    const { name, amount } = record;
    await getCoreServiceClient('accounts').post({
      url: `users/${userId}/notifications`,
      json: {
        type: 'info',
        title: `🧾 ${name} ${amount.toLocaleString()}원 / 결제 환불`,
        description: `결제하신 내역이 환불 처리되었습니다.`,
      },
    });
  }
}
