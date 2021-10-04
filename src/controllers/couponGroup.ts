import { CouponGroupModel, CouponGroupType, Prisma } from '@prisma/client';
import {
  $$$,
  Coupon,
  CouponProperties,
  getPlatformClient,
  Joi,
  prisma,
  RESULT,
} from '..';

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

export interface CouponGroupProperties {
  openapi?: {
    discountGroupId: string;
  };
}

export class CouponGroup {
  public static async createCouponGroup(props: {
    code: string;
    name: string;
    description: string;
    properties: CouponGroupProperties;
  }): Promise<() => Prisma.Prisma__CouponGroupModelClient<CouponGroupModel>> {
    const schema = await Joi.object({
      code: Joi.string().allow(null).optional(),
      name: Joi.string().min(2).max(16).required(),
      type: Joi.string()
        .valid(...Object.values(CouponGroupType))
        .required(),
      validity: Joi.number().allow(null).optional(),
      limit: Joi.number().allow(null).optional(),
      description: Joi.string().default('').allow('').optional(),
      properties: Joi.object().optional(),
    });

    const { code, name, type, description, validity, limit, properties } =
      await schema.validateAsync(props);

    await Promise.all([
      this.isUnusedCouponGroupNameOrThrow(name),
      this.isUnusedCouponGroupCodeOrThrow(code),
    ]);

    if (properties) {
      const { openapi } = <CouponGroupProperties>properties;
      if (openapi) {
        await getPlatformClient()
          .get(`discount/discountGroups/${openapi.discountGroupId}`)
          .json<{ opcode: number; discountGroup: OpenApiDiscountGroup }>();
      }
    }

    return () =>
      prisma.couponGroupModel.create({
        data: {
          code,
          name,
          type,
          validity,
          limit,
          description,
          properties,
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
    if (!couponGroup) throw RESULT.CANNOT_FIND_COUPON_GROUP();
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
    if (!couponGroup) throw RESULT.CANNOT_FIND_COUPON_GROUP();
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
    if (!unused) throw RESULT.DUPLICATED_COUPON_GROUP_NAME();
  }

  public static async isUnusedCouponGroupCode(code: string): Promise<boolean> {
    const exists = await prisma.couponGroupModel.count({ where: { code } });
    return exists <= 0;
  }

  public static async isUnusedCouponGroupCodeOrThrow(
    code: string
  ): Promise<void> {
    const unused = await this.isUnusedCouponGroupCode(code);
    if (!unused) throw RESULT.DUPLICATED_COUPON_GROUP_CODE();
  }

  public static async getCouponPropertiesByCouponGroup(props: {
    couponGroup: CouponGroupModel;
    withGenerate: boolean;
  }): Promise<CouponProperties> {
    const { couponGroup, withGenerate } = props;

    const properties: CouponProperties = {};
    const couponGroupProps = <CouponGroupProperties>couponGroup.properties;
    if (!withGenerate) return properties;

    // openapi 데이터가 있을 경우, openapi 할인 정보를 발급하기
    if (couponGroupProps.openapi) {
      const { discountGroupId } = couponGroupProps.openapi;
      const { discountId, expiredAt } = await Coupon.generateDiscountId(
        discountGroupId
      );

      properties.openapi = {
        discountGroupId,
        discountId,
        expiredAt,
      };
    }

    return properties;
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
