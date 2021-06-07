import dayjs from 'dayjs';
import {
  $$$,
  getAccountsClient,
  OPCODE,
  Record,
  RecordProperties,
  UserModel,
} from '..';
import { getPlatformClient } from '../tools';

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
  public static async onPayment(payload: WebhookPayment): Promise<void> {
    const {
      description,
      paymentId,
      ride: { rideId, userId, kickboardCode },
    } = payload.data;
    const { user } = await getAccountsClient()
      .get(`users/${userId}`)
      .json<{ opcode: OPCODE; user: UserModel }>();

    const properties: RecordProperties = {
      openapi: <any>{ ...payload.data, ride: undefined },
    };

    const type = payload.data.paymentType === 'SERVICE' ? '이용료' : '추가금';
    await $$$(
      Record.createThenPayRecord(user, {
        properties,
        amount: payload.data.amount,
        name: `[${type}] ${kickboardCode} 킥보드`,
        description,
      })
    );

    await getPlatformClient().get(
      `ride/rides/${rideId}/payments/${paymentId}/process`
    );
  }

  public static async onRefund(payload: WebhookPayment): Promise<void> {
    const {
      paymentId,
      ride: { rideId, userId },
    } = payload.data;
    const { user } = await getAccountsClient()
      .get(`users/${userId}`)
      .json<{ opcode: OPCODE; user: UserModel }>();

    const record = await Record.getRecordByPaymentIdOrThrow(user, paymentId);
    await $$$(Record.refundRecord(record));
    await getPlatformClient().get(
      `ride/rides/${rideId}/payments/${paymentId}/process`
    );
  }
}
