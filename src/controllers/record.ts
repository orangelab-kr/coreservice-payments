import { CardModel, Prisma, RecordModel } from '@prisma/client';
import {
  $$$,
  Card,
  Database,
  InternalError,
  Joi,
  Jtnet,
  OPCODE,
  PrismaPromiseOnce,
  UserModel,
} from '..';

const { prisma } = Database;

export class Record {
  public static async createThenPayRecord(
    user: UserModel,
    props: {
      priorityCardId?: string;
      amount: number;
      name: string;
      description?: string;
      required?: boolean;
    }
  ): Promise<RecordModel> {
    const transactions: PrismaPromiseOnce[] = [];
    const { amount, name, description, priorityCardId, required } = props;
    transactions.push(this.createRecord(user, { amount, name, description }));
    if (priorityCardId) transactions.push(Card.getCard(user, priorityCardId));
    const [record, priorityCard] = await $$$(transactions);
    await this.invokePayment({ user, record, priorityCard, required });
    return record;
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

  private static async tryAllPayment(
    user: UserModel,
    record: RecordModel,
    priorityCard?: CardModel | undefined
  ): Promise<{ card: CardModel | undefined; tid: string | undefined }> {
    let tid: string | undefined;
    let card: CardModel | undefined;

    const { name, amount } = record;
    const { realname, phoneNo } = user;
    const cards = await $$$(Card.getCards(user, true));
    for (let i = -1; i <= cards.length + 1; i++) {
      if (i <= -1 && !priorityCard) continue;
      const { billingKey } = i <= -1 ? priorityCard : cards[i];
      try {
        tid = await Jtnet.invokeBilling({
          billingKey,
          productName: name,
          amount,
          realname,
          phone: phoneNo,
        });

        card = cards[i];
        break;
      } catch (err) {}
    }

    return { card, tid };
  }

  public static async invokePayment(props: {
    user: UserModel;
    record: RecordModel;
    priorityCard?: CardModel;
    required?: boolean;
  }): Promise<any> {
    const { user, record, required, priorityCard } = props;
    const { recordId, amount, name, description } = record;
    const { card, tid } = await this.tryAllPayment(user, record, priorityCard);
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

  public static async refundRecord(record: RecordModel): Promise<void> {
    await Jtnet.refundBilling(record);
  }
}
