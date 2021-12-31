import {
  CardModel,
  DunningModel,
  PaymentKeyModel,
  Prisma,
  PrismaPromise,
  RecordModel,
} from '@prisma/client';
import {
  $$$,
  Card,
  getCoreServiceClient,
  getPlatformClient,
  Joi,
  Jtnet,
  prisma,
  RESULT,
  UserModel,
} from '..';

export interface RideModel {
  rideId: string;
  userId: string;
  kickboardCode: string;
  photo: string | null;
  couponId: string | null;
  properties: {
    openapi: {
      rideId: string;
    };
  };
  price: number;
  endedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
}

export interface RecordProperties {
  openapi?: {
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
  };
  coreservice?: {
    rideId?: string;
    passId?: string;
    passProgramId?: string;
  };
}

export class Record {
  // 결제 레코드 생성 후 결제 시도 및 데이터베이스 업데이트
  public static async createThenPayRecord(props: {
    userId: string;
    cardId?: string; // 결제할 카드
    paymentKeyId?: string | null; // 결제할 가맹점
    amount: number; // 결제할 금액
    name: string; // 제품명
    displayName: string; // 표기할 제품명
    description?: string; // 설명
    required: boolean; // 필수 여부
    properties?: RecordProperties; // 기타 속성
  }): Promise<() => Prisma.Prisma__RecordModelClient<RecordModel>> {
    const {
      cardId,
      amount,
      displayName,
      name,
      description,
      required,
      properties,
      userId,
    } = props;

    const paymentKey = props.paymentKeyId
      ? await Jtnet.getPaymentKey(props.paymentKeyId)
      : await Jtnet.getPrimaryPaymentKey();

    const { user } = await getCoreServiceClient('accounts')
      .get(`users/${userId}`)
      .json<{ opcode: number; user: UserModel }>();

    const { paymentKeyId } = paymentKey;
    const record = await $$$(
      this.createRecord(user, {
        // 결제 레코드 생성
        cardId,
        amount,
        name,
        displayName,
        description,
        properties,
        paymentKeyId,
      })
    );

    return this.invokePayment({
      user,
      record,
      required,
      paymentKey,
    });
  }

  public static async modifyRide(
    ride: RideModel,
    props: {
      price?: number;
      userId?: string;
      kickboardCode?: string;
      properties?: any;
    }
  ): Promise<RideModel> {
    return getCoreServiceClient('ride')
      .post(`rides/${ride.rideId}`, { json: props })
      .json<{ opcode: number; ride: RideModel }>()
      .then((res) => res.ride);
  }

  public static async getRideByOpenAPIRideId(
    rideId: string
  ): Promise<RideModel> {
    return getCoreServiceClient('ride')
      .get(`rides/byOpenAPI/${rideId}`)
      .json<{ opcode: number; ride: RideModel }>()
      .then((res) => res.ride);
  }

  public static async createRecord(
    user: UserModel,
    props: {
      cardId?: string;
      amount: number;
      displayName: string;
      name: string;
      paymentKeyId: string;
      description?: string;
      properties?: RecordProperties;
    }
  ): Promise<() => Prisma.Prisma__RecordModelClient<RecordModel>> {
    const schema = Joi.object({
      cardId: Joi.string().uuid().optional(),
      amount: Joi.number().required(),
      displayName: Joi.string().required(),
      name: Joi.string().required(),
      paymentKeyId: Joi.string().uuid().required(),
      description: Joi.string().allow('').optional(),
      properties: Joi.object().optional(),
    });

    const { userId } = user;
    const {
      cardId,
      amount,
      displayName,
      name,
      description,
      properties,
      paymentKeyId,
    } = await schema.validateAsync(props);
    const initialAmount = amount;

    return () =>
      prisma.recordModel.create({
        data: {
          userId,
          cardId,
          amount,
          displayName,
          name,
          initialAmount,
          paymentKeyId,
          description,
          properties,
        },
      });
  }

  public static async setOpenApiProcessed(record: RecordModel): Promise<void> {
    const properties = <RecordProperties>record.properties;
    if (!properties.openapi) return;
    const { rideId, paymentId } = properties.openapi;
    await getPlatformClient().get(
      `ride/rides/${rideId}/payments/${paymentId}/process`
    );
  }

  public static async getUnpaidRecord(
    user: UserModel
  ): Promise<() => PrismaPromise<RecordModel[]>> {
    const { userId } = user;
    return () =>
      prisma.recordModel.findMany({
        where: {
          userId,
          processedAt: null,
          refundedAt: null,
        },
      });
  }

  // 결제 재시도 후 데이터베이스 업데이트
  public static async retryPayment(
    user: UserModel,
    record: RecordModel
  ): Promise<() => Prisma.Prisma__RecordModelClient<RecordModel | null>> {
    if (record.processedAt) throw RESULT.ALREADY_PAIED_RECORD();

    const retiredAt = new Date();
    const { recordId } = record;
    await prisma.recordModel.update({
      where: { recordId },
      data: { retiredAt },
    });

    const required = false;
    const { card, tid } = await this.tryPayment({ user, record, required });
    if (!card) throw RESULT.NO_AVAILABLE_CARD();

    const { cardId } = card;
    const processedAt = new Date();
    await this.setOpenApiProcessed(record);
    return () =>
      prisma.recordModel.update({
        where: { recordId },
        data: { cardId, tid, processedAt },
      });
  }

  // 실질적으로 결제를 진행하는 프로세스
  private static async tryPayment(props: {
    user: UserModel;
    record: RecordModel;
    required: boolean;
  }): Promise<{ card: CardModel | undefined; tid: string | undefined }> {
    let tid: string | undefined;
    let card: CardModel | undefined;

    const { user, record, required } = props;
    const { name, amount, paymentKeyId, cardId } = record;
    const { realname, phoneNo } = user;
    const cards = await $$$(Card.getCards(user, true));
    for (let i = 0; i <= cards.length - 1; i++) {
      const currentCard = cards[i];
      if (required && cardId && currentCard.cardId !== cardId) continue;

      try {
        tid = await Jtnet.invokeBilling({
          billingKey: currentCard.billingKey,
          productName: name,
          phone: phoneNo,
          paymentKeyId,
          realname,
          amount,
        });

        card = currentCard;
        break;
      } catch (err: any) {}
    }

    return { card, tid };
  }

  // 결제 진행(tryPayment) 후 데이터베이스에 업데이트하는 작업
  public static async invokePayment(props: {
    user: UserModel; // 사용자
    record: RecordModel; // 시도할 결제 레코드
    paymentKey: PaymentKeyModel; // 지점이 임의로 존재하는지 확인
    required: boolean; // 무조건 결제가 되야 하는지 여부(미수금 O/X)
  }): Promise<() => Prisma.Prisma__RecordModelClient<RecordModel>> {
    const retiredAt = new Date();
    const { user, record, required } = props;
    const { recordId } = record;
    await prisma.recordModel.update({
      where: { recordId },
      data: { retiredAt },
    });

    const { card, tid } = await this.tryPayment({ user, record, required });
    if (required && !card) throw RESULT.NO_AVAILABLE_CARD();

    const cardId = card && card.cardId;
    const processedAt = card ? new Date() : null;
    return () =>
      prisma.recordModel.update({
        where: { recordId },
        data: { cardId, tid, processedAt },
      });
  }

  public static async getRecords(
    props: {
      take?: number;
      skip?: number;
      search?: string;
      userId?: string;
      orderByField?:
        | 'amount'
        | 'refundedAt'
        | 'processedAt'
        | 'retriedAt'
        | 'createdAt'
        | 'updatedAt';
      orderBySort?: 'asc' | 'desc';
      onlyUnpaid?: boolean;
    },
    user?: UserModel
  ): Promise<{ records: RecordModel[]; total: number }> {
    const {
      take,
      skip,
      search,
      userId,
      orderByField,
      orderBySort,
      onlyUnpaid,
    } = await Joi.object({
      take: Joi.number().default(10).optional(),
      skip: Joi.number().default(0).optional(),
      search: Joi.string().allow('').default('').optional(),
      userId: Joi.string().uuid().optional(),
      orderByField: Joi.string()
        .default('createdAt')
        .valid(
          'amount',
          'refundedAt',
          'processedAt',
          'retriedAt',
          'createdAt',
          'updatedAt'
        )
        .optional(),
      orderBySort: Joi.string().valid('asc', 'desc').default('desc').optional(),
      onlyUnpaid: Joi.boolean().default(false).optional(),
    }).validateAsync(props);

    const where: Prisma.RecordModelWhereInput = {
      OR: [
        { recordId: search },
        { userId: search },
        { cardId: search },
        { paymentKeyId: search },
        { name: { contains: search } },
        { displayName: { contains: search } },
        { description: { contains: search } },
        { reason: { contains: search } },
      ],
    };

    if (userId) where.userId = userId;
    if (user) where.userId = user.userId;
    if (onlyUnpaid) where.processedAt = null;
    const orderBy = { [orderByField]: orderBySort };
    const [total, records] = await prisma.$transaction([
      prisma.recordModel.count({ where }),
      prisma.recordModel.findMany({
        where,
        take,
        skip,
        orderBy,
      }),
    ]);

    return { records, total };
  }

  public static async getRecord(
    recordId: string,
    user?: UserModel
  ): Promise<() => Prisma.Prisma__RecordModelClient<RecordModel | null>> {
    const userId = user?.userId;
    return () =>
      prisma.recordModel.findFirst({
        where: { userId, recordId },
      });
  }

  public static async getRecordOrThrow(
    recordId: string,
    user?: UserModel
  ): Promise<RecordModel> {
    const record = await $$$(this.getRecord(recordId, user));
    if (!record) throw RESULT.CANNOT_FIND_RECORD();
    return record;
  }

  public static async getRecordByOpenApiPaymentId(
    paymentId: string
  ): Promise<RecordModel | null> {
    return prisma.recordModel.findFirst({
      where: {
        properties: {
          path: '$.openapi.paymentId',
          equals: paymentId,
        },
      },
    });
  }

  public static async getRecordByOpenApiPaymentIdorThrow(
    recordId: string
  ): Promise<RecordModel> {
    const record = await Record.getRecordByOpenApiPaymentId(recordId);
    if (!record) throw RESULT.CANNOT_FIND_RECORD();
    return record;
  }

  public static async getRecordByPaymentId(
    user: UserModel,
    paymentId: string
  ): Promise<() => Prisma.Prisma__RecordModelClient<RecordModel | null>> {
    const { userId } = user;
    return () =>
      prisma.recordModel.findFirst({
        where: {
          userId,
          properties: {
            path: '$.openapi.paymentId',
            equals: paymentId,
          },
        },
      });
  }

  public static async getRecordByPaymentIdOrThrow(
    user: UserModel,
    paymentId: string
  ): Promise<RecordModel> {
    const record = await $$$(this.getRecordByPaymentId(user, paymentId));
    if (!record) throw RESULT.CANNOT_FIND_RECORD();
    return record;
  }

  public static async refundRecord(
    record: RecordModel,
    props: { reason?: string; amount?: number }
  ): Promise<() => Prisma.Prisma__RecordModelClient<RecordModel>> {
    const { recordId, refundedAt, tid } = record;
    const { reason, amount } = await Joi.object({
      reason: Joi.string().optional(),
      amount: Joi.number().default(record.amount).max(record.amount).optional(),
    }).validateAsync(props);
    if (refundedAt && !record.amount) throw RESULT.ALREADY_REFUNDED_RECORD();
    const updatedAmount = record.amount - amount;
    if (tid) await Jtnet.refundBilling(record, { reason, amount });
    return () =>
      prisma.recordModel.update({
        where: { recordId },
        data: {
          refundedAt: new Date(),
          amount: updatedAmount,
          reason,
        },
      });
  }

  public static async updateRidePrice(ride: RideModel): Promise<void> {
    const { rideId }: any = ride.properties.openapi;
    const properties = { path: '$.openapi.rideId', equals: rideId };
    const price = await prisma.recordModel
      .findMany({ where: { properties, refundedAt: null } })
      .then((records) => records.map((record) => record.amount))
      .then((amount) => amount.reduce((a, b) => a + b));

    await Record.modifyRide(ride, { price });
  }
}
