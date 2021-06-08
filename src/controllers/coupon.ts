import { CouponModel, Prisma, PrismaPromise } from '@prisma/client';
import { CouponGroup, CouponGroupProperties, Joi, UserModel } from '..';
import {
  $$$,
  Database,
  getPlatformClient,
  InternalError,
  OPCODE,
} from '../tools';

const { prisma } = Database;

export interface OpenApiDiscount {
  discountId: string;
  discountGroupId: string;
  expiredAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponProperties {
  openapi?: {
    discountGroupId: string;
    discountId: string;
  };
}

export class Coupon {
  public static async getCouponOrThrow(
    user: UserModel,
    couponId: string
  ): Promise<CouponModel> {
    const coupon = await $$$(this.getCoupon(user, couponId));
    if (!coupon) {
      throw new InternalError('쿠폰을 찾을 수 없습니다.', OPCODE.NOT_FOUND);
    }

    return coupon;
  }

  public static async getCoupon(
    user: UserModel,
    couponId: string
  ): Promise<() => Prisma.Prisma__CouponModelClient<CouponModel | null>> {
    const { userId } = user;
    return () =>
      prisma.couponModel.findFirst({
        where: { userId, couponId },
      });
  }

  public static async getCoupons(
    user: UserModel,
    props: {
      take?: number;
      skip?: number;
      search?: string;
      showUsed?: boolean;
      orderByField?: 'createdAt' | 'usedAt' | 'expiredAt';
      orderBySort?: 'asc' | 'desc';
    }
  ): Promise<{ coupons: CouponModel[]; total: number }> {
    const schema = Joi.object({
      take: Joi.number().default(10).optional(),
      skip: Joi.number().default(0).optional(),
      search: Joi.string().default('').allow('').optional(),
      showUsed: Joi.boolean().default(true).optional(),
      orderByField: Joi.string()
        .valid('createdAt', 'usedAt', 'expiredAt')
        .default('createdAt')
        .optional(),
      orderBySort: Joi.string().valid('asc', 'desc').default('desc').optional(),
    });

    const { take, skip, search, showUsed, orderByField, orderBySort } =
      await schema.validateAsync(props);

    const { userId } = user;
    const orderBy = { [orderByField]: orderBySort };
    const where: Prisma.CouponModelWhereInput = {
      userId,
      OR: [
        { couponId: search },
        { couponGroupId: search },
        { couponGroup: { name: { contains: search } } },
        { couponGroup: { description: { contains: search } } },
      ],
    };

    if (!showUsed) where.usedAt = null;
    const [total, coupons] = await prisma.$transaction([
      prisma.couponModel.count({ where }),
      prisma.couponModel.findMany({
        where,
        take,
        skip,
        orderBy,
      }),
    ]);

    return { total, coupons };
  }

  public static async modifyCoupon(
    coupon: CouponModel,
    props: {
      couponGroupId?: string;
      usedAt?: Date;
      expiredAt?: Date;
      properties?: CouponProperties;
    }
  ): Promise<any> {
    const { couponId } = coupon;
    const schema = await Joi.object({
      couponGroupId: Joi.string().uuid().optional(),
      usedAt: Joi.date().allow(null).optional(),
      expiredAt: Joi.date().allow(null).optional(),
      properties: Joi.object().optional(),
    });

    const { properties, couponGroupId, usedAt, expiredAt } =
      await schema.validateAsync(props);

    return () =>
      prisma.couponModel.update({
        where: { couponId },
        data: {
          couponGroupId,
          usedAt,
          expiredAt,
          properties,
        },
      });
  }

  public static async enrollCoupon(
    user: UserModel,
    code: string
  ): Promise<() => Prisma.Prisma__CouponModelClient<CouponModel>> {
    const { userId } = user;
    const couponGroup = await CouponGroup.getCouponGroupByCodeOrThrow(code);
    const { couponGroupId, limit } = couponGroup;

    if (limit) {
      const duplicateCount = await $$$(
        this.getCouponDuplicateCount(user, couponGroupId)
      );

      if (duplicateCount >= limit) {
        throw new InternalError(
          `해당 쿠폰은 ${limit}회만 사용 가능합니다.`,
          OPCODE.EXCESS_LIMITS
        );
      }
    }

    let discount: OpenApiDiscount | undefined;
    const properties = <CouponGroupProperties>couponGroup.properties;
    if (properties && properties.openapi) {
      const { discountGroupId } = properties.openapi;
      discount = await this.generateDiscountId(discountGroupId);
    }

    const discountId = discount ? discount.discountId : null;
    const discountGroupId = discount ? discount.discountGroupId : null;
    const expiredAt = discount ? new Date(discount.expiredAt) : null;
    return () =>
      prisma.couponModel.create({
        data: {
          userId,
          couponGroupId,
          expiredAt,
          properties: {
            openapi: {
              discountId,
              discountGroupId,
            },
          },
        },
      });
  }

  public static async generateDiscountId(
    discountGroupId: string
  ): Promise<OpenApiDiscount> {
    const { discount } = await getPlatformClient()
      .get(`discount/${discountGroupId}/generate`)
      .json<{ opcode: number; discount: OpenApiDiscount }>();

    return discount;
  }

  public static async getCouponDuplicateCount(
    user: UserModel,
    couponGroupId: string
  ): Promise<() => PrismaPromise<number>> {
    const { userId } = user;
    return () => prisma.couponModel.count({ where: { userId, couponGroupId } });
  }
}
