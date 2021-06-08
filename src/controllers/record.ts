import {
  CardModel,
  PaymentKeyModel,
  Prisma,
  PrismaPromise,
  RecordModel,
} from '@prisma/client';
import {
  $$$,
  Card,
  InternalError,
  Joi,
  Jtnet,
  OPCODE,
  getPlatformClient,
  UserModel,
} from '..';
import { Database } from '../tools';

const { prisma } = Database;

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
}

export class Record {
  // 결제 레코드 생성 후 결제 시도 및 데이터베이스 업데이트
  public static async createThenPayRecord(
    user: UserModel,
    props: {
      paymentKeyId?: string; // 결제할 가맹점
      amount: number; // 결제할 금액
      name: string; // 제품명
      description?: string; // 설명
      required?: boolean; // 필수 여부
      properties?: RecordProperties; // 기타 속성
    }
  ): Promise<() => Prisma.Prisma__RecordModelClient<RecordModel>> {
    const { amount, name, description, required, properties } = props;
    const paymentKey = props.paymentKeyId
      ? await Jtnet.getPaymentKey(props.paymentKeyId)
      : await Jtnet.getPrimaryPaymentKey();

    const { paymentKeyId } = paymentKey;
    const record = await $$$(
      this.createRecord(user, {
        // 결제 레코드 생성
        amount,
        name,
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

  public static async createRecord(
    user: UserModel,
    props: {
      amount: number;
      name: string;
      paymentKeyId: string;
      description?: string;
      properties?: RecordProperties;
    }
  ): Promise<() => Prisma.Prisma__RecordModelClient<RecordModel>> {
    const schema = Joi.object({
      cardId: Joi.string().uuid().optional(),
      amount: Joi.number().required(),
      name: Joi.string().required(),
      paymentKeyId: Joi.string().uuid().required(),
      description: Joi.string().allow('').optional(),
      properties: Joi.object().optional(),
    });

    const { userId } = user;
    const { cardId, amount, name, description, properties, paymentKeyId } =
      await schema.validateAsync(props);

    return () =>
      prisma.recordModel.create({
        data: {
          userId,
          cardId,
          amount,
          name,
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

  // 실질적으로 결제를 진행하는 프로세스
  private static async tryPayment(props: {
    user: UserModel;
    record: RecordModel;
  }): Promise<{ card: CardModel | undefined; tid: string | undefined }> {
    let tid: string | undefined;
    let card: CardModel | undefined;

    const { user, record } = props;
    const { name, amount, paymentKeyId } = record;
    const { realname, phoneNo } = user;
    const cards = await $$$(Card.getCards(user, true));
    for (let i = 0; i <= cards.length - 1; i++) {
      const currentCard = cards[i];
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
      } catch (err) {}
    }

    return { card, tid };
  }

  // 결제 진행(tryPayment) 후 데이터베이스에 업데이트하는 작업
  public static async invokePayment(props: {
    user: UserModel; // 사용자
    record: RecordModel; // 시도할 결제 레코드
    paymentKey: PaymentKeyModel; // 지점이 임의로 존재하는지 확인
    required?: boolean; // 무조건 결제가 되야 하는지 여부(미수금 O/X)
  }): Promise<() => Prisma.Prisma__RecordModelClient<RecordModel>> {
    const retiredAt = new Date();
    const { user, record, required } = props;
    const { recordId } = record;
    await prisma.recordModel.update({
      where: { recordId },
      data: { retiredAt },
    });

    const { card, tid } = await this.tryPayment({ user, record });
    if (required && !card) {
      throw new InternalError(
        '결제 가능한 카드가 없습니다.',
        OPCODE.ACCESS_DENIED
      );
    }

    const cardId = card && card.cardId;
    const processedAt = card ? new Date() : null;
    return () =>
      prisma.recordModel.update({
        where: { recordId },
        data: { cardId, tid, processedAt },
      });
  }

  public static async getRecords(
    user: UserModel,
    props: {
      take?: number;
      skip?: number;
      search?: string;
      orderByField?:
        | 'amount'
        | 'refundedAt'
        | 'processedAt'
        | 'retriedAt'
        | 'createdAt'
        | 'updatedAt';
      orderBySort?: 'asc' | 'desc';
    }
  ): Promise<{ records: RecordModel[]; total: number }> {
    const schema = Joi.object({
      take: Joi.number().default(10).optional(),
      skip: Joi.number().default(0).optional(),
      search: Joi.string().allow('').default('').optional(),
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
    });

    const { take, skip, search, orderByField, orderBySort } =
      await schema.validateAsync(props);

    const { userId } = user;
    const where: Prisma.RecordModelWhereInput = {
      userId,
      OR: [
        { recordId: search },
        { userId: search },
        { cardId: search },
        { paymentKeyId: search },
        { name: { contains: search } },
        { description: { contains: search } },
        { reason: { contains: search } },
      ],
    };

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
    user: UserModel,
    recordId: string
  ): Promise<() => Prisma.Prisma__RecordModelClient<RecordModel | null>> {
    const { userId } = user;
    return () =>
      prisma.recordModel.findFirst({
        where: { userId, recordId },
      });
  }

  public static async getRecordOrThrow(
    user: UserModel,
    recordId: string
  ): Promise<RecordModel> {
    const record = await $$$(this.getRecord(user, recordId));
    if (!record) {
      throw new InternalError(
        '결제 내역을 찾을 수 없습니다.',
        OPCODE.NOT_FOUND
      );
    }

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
    if (!record) {
      throw new InternalError(
        '결제 내역을 찾을 수 없습니다.',
        OPCODE.NOT_FOUND
      );
    }

    return record;
  }

  public static async refundRecord(
    record: RecordModel,
    reason?: string
  ): Promise<() => Prisma.Prisma__RecordModelClient<RecordModel>> {
    const { recordId, refundedAt, tid } = record;
    if (refundedAt) {
      throw new InternalError('이미 환불된 거래입니다.', OPCODE.ALREADY_EXISTS);
    }

    if (tid) await Jtnet.refundBilling(record);
    return () =>
      prisma.recordModel.update({
        where: { recordId },
        data: {
          refundedAt: new Date(),
          reason,
        },
      });
  }
}
