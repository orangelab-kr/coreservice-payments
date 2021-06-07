import {
  CardModel,
  PaymentKeyModel,
  Prisma,
  RecordModel,
} from '@prisma/client';
import {
  $$$,
  Card,
  InternalError,
  Joi,
  Jtnet,
  OPCODE,
  PrismaPromiseOnce,
  UserModel,
} from '..';
import { Database } from '../tools';

const { prisma } = Database;

export class Record {
  public static async createThenPayRecord(
    user: UserModel,
    props: {
      priorityCardId?: string;
      paymentKeyId?: string;
      amount: number;
      name: string;
      description?: string;
      required?: boolean;
    }
  ): Promise<() => Prisma.Prisma__RecordModelClient<RecordModel>> {
    const {
      amount,
      name,
      description,
      priorityCardId,
      required,
      paymentKeyId,
    } = props;

    const transactions: PrismaPromiseOnce[] = [];
    transactions.push(this.createRecord(user, { amount, name, description }));
    if (priorityCardId) {
      transactions.push(Card.getCard(user, priorityCardId, true));
    }

    let paymentKey: PaymentKeyModel | undefined;
    const [record, priorityCard] = await $$$(transactions);
    if (paymentKeyId) paymentKey = await Jtnet.getPaymentKey(paymentKeyId);
    return this.invokePayment({
      user,
      record,
      priorityCard,
      required,
      paymentKey,
    });
  }

  public static async createRecord(
    user: UserModel,
    props: {
      amount: number;
      name: string;
      description?: string;
    }
  ): Promise<() => Prisma.Prisma__RecordModelClient<RecordModel>> {
    const schema = Joi.object({
      cardId: Joi.string().uuid().optional(),
      amount: Joi.number().required(),
      name: Joi.string().required(),
      description: Joi.string().allow('').optional(),
    });

    const { userId } = user;
    const { cardId, amount, name, description } = await schema.validateAsync(
      props
    );

    return () =>
      prisma.recordModel.create({
        data: {
          userId,
          cardId,
          amount,
          name,
          description,
        },
      });
  }

  private static async tryPayment(props: {
    user: UserModel;
    record: RecordModel;
    priorityCard?: CardModel | undefined;
    paymentKey: PaymentKeyModel;
  }): Promise<{ card: CardModel | undefined; tid: string | undefined }> {
    let tid: string | undefined;
    let card: CardModel | undefined;

    const { user, record, priorityCard, paymentKey } = props;
    const { name, amount } = record;
    const { realname, phoneNo } = user;
    const { paymentKeyId } = paymentKey;
    const cards = await $$$(Card.getCards(user, true));
    for (let i = -1; i <= cards.length - 1; i++) {
      if (i <= -1 && !priorityCard) continue;
      const currentCard = i <= -1 ? priorityCard : cards[i];
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

  public static async invokePayment(props: {
    user: UserModel;
    record: RecordModel;
    priorityCard?: CardModel;
    paymentKey?: PaymentKeyModel | undefined;
    required?: boolean;
    onlyPriorityCard?: boolean;
  }): Promise<() => Prisma.Prisma__RecordModelClient<RecordModel>> {
    const { user, record, required, priorityCard } = props;
    const { recordId, amount, name, description } = record;
    const paymentKey = props.paymentKey || (await Jtnet.getPrimaryPaymentKey());
    const { card, tid } = await this.tryPayment({
      user,
      record,
      priorityCard,
      paymentKey,
    });

    if (required && !card) {
      throw new InternalError(
        '결제 가능한 카드가 없습니다.',
        OPCODE.ACCESS_DENIED
      );
    }

    const { userId } = user;
    const retiredAt = new Date();
    const cardId = card && card.cardId;
    const processedAt = card ? new Date() : null;
    const paymentKeyId = paymentKey && paymentKey.paymentKeyId;
    return () =>
      prisma.recordModel.update({
        where: { recordId },
        data: {
          userId,
          cardId,
          amount,
          tid,
          name,
          description,
          paymentKeyId,
          processedAt,
          retiredAt,
        },
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

  public static async refundRecord(
    record: RecordModel,
    reason?: string
  ): Promise<() => Prisma.Prisma__RecordModelClient<RecordModel>> {
    const { recordId, refundedAt, processedAt } = record;
    if (refundedAt) {
      throw new InternalError('이미 환불된 거래입니다.', OPCODE.ALREADY_EXISTS);
    }

    if (processedAt) await Jtnet.refundBilling(record);
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
