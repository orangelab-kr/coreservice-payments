import { CardModel, Prisma, PrismaPromise, RecordModel } from '.prisma/client';
import { Joi, OPCODE, Jtnet, UserModel, $$$, InternalError } from '..';
import { Database } from '../tools';

const { prisma } = Database;

export class Card {
  public static async getCards(
    user: UserModel,
    showBillingKey = false
  ): Promise<() => PrismaPromise<CardModel[]>> {
    const { userId } = user;
    return () =>
      prisma.cardModel.findMany({
        where: { userId },
        orderBy: { orderBy: 'asc' },
        select: {
          cardId: true,
          userId: true,
          orderBy: true,
          cardName: true,
          billingKey: showBillingKey,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      });
  }

  public static async getCard(
    user: UserModel,
    cardId: string
  ): Promise<() => PrismaPromise<CardModel | null>> {
    const { userId } = user;
    return () =>
      prisma.cardModel.findFirst({
        where: { userId, cardId },
      });
  }

  public static async isUnregisteredCard(
    user: UserModel,
    cardName: string
  ): Promise<boolean> {
    const { userId } = user;
    const card = await prisma.cardModel.findFirst({
      where: { userId, cardName },
    });

    return !card;
  }

  public static async isUnregisteredCardOrThrow(
    user: UserModel,
    cardName: string
  ): Promise<void> {
    const isUnregistered = await this.isUnregisteredCard(user, cardName);
    if (!isUnregistered) {
      throw new InternalError('이미 등록한 카드입니다.', OPCODE.ALREADY_EXISTS);
    }
  }

  public static async revokeCard(
    user: UserModel,
    card: CardModel
  ): Promise<void> {
    const { userId } = user;
    const { cardId, billingKey } = card;
    await prisma.cardModel.deleteMany({ where: { userId, cardId } });
    await Jtnet.revokeBilling(billingKey);
    await this.reindexCard(user);
  }

  public static async getCardOrThrow(
    user: UserModel,
    cardId: string
  ): Promise<CardModel> {
    const card = await $$$(this.getCard(user, cardId));
    if (!card) {
      throw new InternalError('카드를 찾을 수 없습니다.', OPCODE.NOT_FOUND);
    }

    return card;
  }

  public static async registerCard(
    user: UserModel,
    props: {
      cardNumber: string;
      expiry: string;
      password: string;
      birthday: string;
    }
  ): Promise<() => Prisma.Prisma__CardModelClient<CardModel>> {
    const { userId } = user;
    const { billingKey, cardName } = await Jtnet.createBillingKey(props);
    await this.isUnregisteredCardOrThrow(user, cardName);
    const { length: orderBy } = await $$$(this.getCards(user));
    return () =>
      prisma.cardModel.create({
        data: { userId, billingKey, cardName, orderBy },
      });
  }

  public static async reorderCard(
    user: UserModel,
    cardIds: string[]
  ): Promise<Prisma.BatchPayload[]> {
    let i = 0;
    const { userId } = user;
    cardIds = await Joi.array().items(Joi.string()).validateAsync(cardIds);
    return prisma.$transaction(
      cardIds.map((cardId) =>
        prisma.cardModel.updateMany({
          where: { cardId, userId },
          data: { orderBy: i++ },
        })
      )
    );
  }

  public static async reindexCard(user: UserModel): Promise<void> {
    const cards = await $$$(Card.getCards(user));
    const cardIds = cards.map(({ cardId }: CardModel) => cardId);
    await this.reorderCard(user, cardIds);
  }
}
