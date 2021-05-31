import { CouponGroupModel, Prisma } from '@prisma/client';
import {
  $$$,
  Database,
  getPlatformClient,
  InternalError,
  Joi,
  OPCODE,
} from '../tools';

const { prisma } = Database;

interface OpenApiDiscountGroup {
  discountGroupId: string;
  enabled: boolean;
  name: string;
  description: string;
  remainingCount: number;
  platformId: string;
  ratioPriceDiscount: number;
  staticPriceDiscount: number;
  staticMinuteDiscount: number;
  isSurchargeIncluded: boolean;
  isStandardPriceIncluded: boolean;
  isPerMinutePriceIncluded: number;
  validity: number;
  createdAt: Date;
  updatedAt: Date;
}

export class CouponGroup {
  public static async createCouponGroup(props: {
    code: string;
    name: string;
    description: string;
    discountGroupId: string;
  }): Promise<() => Prisma.Prisma__CouponGroupModelClient<CouponGroupModel>> {
    const schema = await Joi.object({
      code: Joi.string().required(),
      name: Joi.string().min(2).max(16).required(),
      description: Joi.string().default('').allow('').optional(),
      discountGroupId: Joi.string().uuid().required(),
    });

    const { code, name, description, discountGroupId } =
      await schema.validateAsync(props);

    await Promise.all([
      this.isUnusedCouponGroupNameOrThrow(name),
      this.isUnusedCouponGroupCodeOrThrow(code),
    ]);

    await getPlatformClient()
      .get(`discount/${discountGroupId}`)
      .json<{ opcode: number; discountGroup: OpenApiDiscountGroup }>();

    return () =>
      prisma.couponGroupModel.create({
        data: {
          code,
          name,
          description,
          discountGroupId,
        },
      });
  }

  public static async getCouponGroup(
    couponGroupId: string
  ): Promise<
    () => Prisma.Prisma__CouponGroupModelClient<CouponGroupModel | null>
  > {
    return () =>
      prisma.couponGroupModel.findFirst({ where: { couponGroupId } });
  }

  public static async getCouponGroupOrThrow(
    couponGroupId: string
  ): Promise<CouponGroupModel> {
    const couponGroup = await $$$(this.getCouponGroup(couponGroupId));
    if (!couponGroup) {
      throw new InternalError(
        '해당 쿠폰을 찾을 수 없습니다.',
        OPCODE.NOT_FOUND
      );
    }

    return couponGroup;
  }

  public static async getCouponGroupByCode(
    code: string
  ): Promise<
    () => Prisma.Prisma__CouponGroupModelClient<CouponGroupModel | null>
  > {
    return () => prisma.couponGroupModel.findFirst({ where: { code } });
  }

  public static async getCouponGroupByCodeOrThrow(
    code: string
  ): Promise<CouponGroupModel> {
    const couponGroup = await $$$(this.getCouponGroupByCode(code));
    if (!couponGroup) {
      throw new InternalError(
        '해당 쿠폰을 찾을 수 없습니다.',
        OPCODE.NOT_FOUND
      );
    }

    return couponGroup;
  }

  public static async isUnusedCouponGroupName(name: string): Promise<boolean> {
    const exists = await prisma.couponGroupModel.count({ where: { name } });
    return exists <= 0;
  }

  public static async isUnusedCouponGroupNameOrThrow(
    name: string
  ): Promise<void> {
    const unused = await this.isUnusedCouponGroupName(name);
    if (!unused) {
      throw new InternalError(
        '이미 사용중인 이름입니다.',
        OPCODE.ALREADY_EXISTS
      );
    }
  }

  public static async isUnusedCouponGroupCode(code: string): Promise<boolean> {
    const exists = await prisma.couponGroupModel.count({ where: { code } });
    return exists <= 0;
  }

  public static async isUnusedCouponGroupCodeOrThrow(
    code: string
  ): Promise<void> {
    const unused = await this.isUnusedCouponGroupCode(code);
    if (!unused) {
      throw new InternalError(
        '이미 사용중인 코드입니다.',
        OPCODE.ALREADY_EXISTS
      );
    }
  }

  public static async getCouponGroups(props: {
    take?: number;
    skip?: number;
    search?: string;
    orderByField?: 'createdAt' | 'usedAt' | 'expiredAt';
    orderBySort?: 'asc' | 'desc';
  }): Promise<{ couponGroups: CouponGroupModel[]; total: number }> {
    const schema = Joi.object({
      take: Joi.number().default(10).optional(),
      skip: Joi.number().default(0).optional(),
      search: Joi.string().default('').allow('').optional(),
      showUsed: Joi.boolean().default(true).optional(),
      orderByField: Joi.string()
        .valid('createdAt')
        .default('createdAt')
        .optional(),
      orderBySort: Joi.string().valid('asc', 'desc').default('desc').optional(),
    });

    const { take, skip, search, orderByField, orderBySort } =
      await schema.validateAsync(props);

    const orderBy = { [orderByField]: orderBySort };
    const where: Prisma.CouponGroupModelWhereInput = {
      OR: [
        { couponGroupId: search },
        { name: { contains: search } },
        { description: { contains: search } },
      ],
    };

    const [total, couponGroups] = await prisma.$transaction([
      prisma.couponGroupModel.count({ where }),
      prisma.couponGroupModel.findMany({
        where,
        take,
        skip,
        orderBy,
      }),
    ]);

    return { total, couponGroups };
  }
}
