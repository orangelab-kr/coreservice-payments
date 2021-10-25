import {
  CouponGroupModel,
  CouponGroupType,
  CouponModel,
  Prisma,
  PrismaPromise,
} from '@prisma/client';
import dayjs from 'dayjs';
import {
  $$$,
  CouponGroup,
  getPlatformClient,
  Joi,
  prisma,
  RESULT,
  UserModel,
} from '..';

export interface OpenApiDiscount {
  discountId: string;
  discountGroupId: string;
  expiredAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
  discountGroup: {
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
    isPerMinutePriceIncluded: boolean;
    validity?: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: null;
  };
}

export interface CouponProperties {
  // 1회성일때만 존재함
  openapi?: {
    discountGroupId: string;
    discountId: string;
    expiredAt: Date;
  };
}

export class Coupon {
  public static defaultSelect: Prisma.CouponModelSelect = {
    couponId: true,
    userId: true,
    couponGroupId: true,
    couponGroup: {
      select: {
        couponGroupId: true,
        code: false,
        type: true,
        name: true,
        description: true,
        validity: true,
        limit: true,
        properties: false,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    },
    properties: false,
    usedAt: true,
    expiredAt: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
  };

  public static async getCouponOrThrow(
    user: UserModel,
    couponId: string,
    showProperties = false
  ): Promise<CouponModel> {
    const coupon = await $$$(this.getCoupon(user, couponId, showProperties));
    if (!coupon) throw RESULT.CANNOT_FIND_COUPON();
    return coupon;
  }

  public static async getCoupon(
    user: UserModel,
    couponId: string,
    showProperties = false
  ): Promise<() => Prisma.Prisma__CouponModelClient<CouponModel | null>> {
    const { userId } = user;
    const query: Prisma.CouponModelFindFirstArgs = {
      where: { userId, couponId },
    };

    if (showProperties) query.include = { couponGroup: true };
    else query.select = Coupon.defaultSelect;
    return <() => Prisma.Prisma__CouponModelClient<CouponModel | null>>(
      (() => prisma.couponModel.findFirst(query))
    );
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

    const select = this.defaultSelect;
    if (!showUsed) where.usedAt = null;
    const [total, coupons] = <any>await prisma.$transaction([
      prisma.couponModel.count({ where }),
      prisma.couponModel.findMany({
        select,
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
  ): Promise<() => Prisma.Prisma__CouponModelClient<CouponModel>> {
    const { couponId } = coupon;
    const schema = await Joi.object({
      couponGroupId: Joi.string().uuid().optional(),
      usedAt: Joi.date().allow(null).optional(),
      expiredAt: Joi.date().allow(null).optional(),
      properties: Joi.object().optional(),
    });

    const { properties, couponGroupId, usedAt, expiredAt } =
      await schema.validateAsync(props);

    return <() => Prisma.Prisma__CouponModelClient<CouponModel>>(() =>
      prisma.couponModel.update({
        select: this.defaultSelect,
        where: { couponId },
        data: {
          couponGroupId,
          usedAt,
          expiredAt,
          properties,
        },
      }));
  }

  public static async redeemCoupon(
    coupon: CouponModel & { couponGroup?: CouponGroupModel }
  ): Promise<CouponProperties> {
    const { couponId } = coupon;
    const { ONETIME, LONGTIME } = CouponGroupType;
    if (!coupon.couponGroup) throw RESULT.INVALID_ERROR();
    if (coupon.expiredAt && dayjs(coupon.expiredAt).isBefore(dayjs())) {
      throw RESULT.EXPIRED_COUPON();
    }

    if (coupon.couponGroup.type === ONETIME) {
      // 일회성 쿠폰의 경우 사용 처리를 한다.
      await prisma.couponModel.update({
        where: { couponId },
        data: { usedAt: new Date() },
      });
    }

    // 이미 속성이 있는 경우 기존 정보를 사용한다.
    if (coupon.properties && JSON.stringify(coupon.properties) !== '{}') {
      return <CouponProperties>coupon.properties;
    }

    const { couponGroup } = coupon;
    const withGenerate = coupon.couponGroup.type === LONGTIME;
    const properties = CouponGroup.getCouponPropertiesByCouponGroup({
      couponGroup,
      withGenerate,
    });

    return properties;
  }

  public static async enrollCouponByCode(
    user: UserModel,
    props: { code: string }
  ): Promise<() => Prisma.Prisma__CouponModelClient<CouponModel>> {
    const { code } = await Joi.object({
      code: Joi.string().required(),
    }).validateAsync(props);

    const couponGroup = await CouponGroup.getCouponGroupByCodeOrThrow(code);
    return Coupon.enrollCoupon(user, couponGroup);
  }

  public static async enrollCouponByCouponGroupId(
    user: UserModel,
    props: { couponGroupId: string }
  ): Promise<() => Prisma.Prisma__CouponModelClient<CouponModel>> {
    const { couponGroupId } = await Joi.object({
      couponGroupId: Joi.string().uuid().required(),
    }).validateAsync(props);

    const couponGroup = await CouponGroup.getCouponGroupOrThrow(couponGroupId);
    return Coupon.enrollCoupon(user, couponGroup);
  }

  public static async enrollCoupon(
    user: UserModel,
    couponGroup: CouponGroupModel
  ): Promise<() => Prisma.Prisma__CouponModelClient<CouponModel>> {
    const { userId } = user;
    const { couponGroupId, limit } = couponGroup;

    if (limit) {
      const duplicateCount = await $$$(
        this.getCouponDuplicateCount(user, couponGroupId)
      );

      if (duplicateCount >= limit) {
        throw RESULT.EXCEEDED_USAGE_COUPON({ args: [`${limit}`] });
      }
    }

    const withGenerate = couponGroup.type === CouponGroupType.ONETIME;
    const couponProps = await CouponGroup.getCouponPropertiesByCouponGroup({
      couponGroup,
      withGenerate,
    });

    let expiredAt: Date | undefined;
    // 일회성 쿠폰의 만료일이 있을 경우, 자동으로 만료일을 할당한다.
    if (couponProps.openapi?.expiredAt) {
      expiredAt = couponProps.openapi.expiredAt;
    }

    // 쿠폰 그룹에 만료일이 있을 경우, 할인의 만료 정보를 무시한다.
    if (couponGroup.validity) {
      expiredAt = dayjs().add(couponGroup.validity, 's').toDate();
    }

    const properties = <any>couponProps;
    return <() => Prisma.Prisma__CouponModelClient<CouponModel>>(() =>
      prisma.couponModel.create({
        select: this.defaultSelect,
        data: {
          userId,
          couponGroupId,
          expiredAt,
          properties,
        },
      }));
  }

  public static async generateDiscountId(
    discountGroupId: string
  ): Promise<OpenApiDiscount> {
    const { discount } = await getPlatformClient()
      .get(`discount/discountGroups/${discountGroupId}/generate`)
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

  public static async deleteCoupon(
    coupon: CouponModel
  ): Promise<() => Prisma.Prisma__CouponModelClient<CouponModel>> {
    const { couponId } = coupon;
    return () => prisma.couponModel.delete({ where: { couponId } });
  }
}
