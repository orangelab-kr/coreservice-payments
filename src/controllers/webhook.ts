import {
  $$$,
  getCoreServiceClient,
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
  public static async onPayment(payload: WebhookPayment): Promise<void> {
    const { data } = payload;
    const ride = await Record.getRideByOpenAPIRideId(data.rideId);
    await getCoreServiceClient('accounts')
      .get(`users/${data.ride.userId}`)
      .json<{ opcode: number; user: UserModel }>();

    const properties: RecordProperties = {
      coreservice: { rideId: ride.rideId },
      openapi: <any>{ ...data, ride: undefined },
    };

    const type = data.paymentType === 'SERVICE' ? '이용료' : '추가금';
    const record = await $$$(
      Record.createThenPayRecord({
        userId: data.ride.userId,
        amount: data.amount,
        name: `[${type}] ${data.ride.kickboardCode} 킥보드`,
        description: data.description,
        properties,
      })
    );

    await Record.setOpenApiProcessed(record);
    await Record.updateRidePrice(ride).catch(() => null);
  }

  public static async onRefund(payload: WebhookPayment): Promise<void> {
    const {
      paymentId,
      ride: { userId, rideId },
    } = payload.data;
    const ride = await Record.getRideByOpenAPIRideId(rideId);
    const { user } = await getCoreServiceClient('accounts')
      .get(`users/${userId}`)
      .json<{ opcode: number; user: UserModel }>();

    const record = await Record.getRecordByPaymentIdOrThrow(user, paymentId);
    await $$$(Record.refundRecord(record));
    await Record.setOpenApiProcessed(record);
    await Record.updateRidePrice(ride).catch(() => null);
  }
}
