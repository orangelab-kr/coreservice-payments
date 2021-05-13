import {
  FranchisePermission,
  InternalFranchiseClient,
  InternalPlatformClient,
  PlatformPermission,
} from 'openapi-internal-sdk';

export class InternalClient {
  public static getFranchise(
    permissions?: FranchisePermission[],
    email = 'system@hikick.kr'
  ): InternalFranchiseClient {
    const client = new InternalFranchiseClient({
      secretKey: process.env.HIKICK_OPENAPI_FRANCHISE_KEY || '',
      issuer: process.env.HIKICK_OPENAPI_ISSUER || '',
      permissions,
      email,
    });

    return client;
  }

  public static getPlatform(
    permissions?: PlatformPermission[],
    email = 'system@hikick.kr'
  ): InternalPlatformClient {
    const client = new InternalPlatformClient({
      secretKey: process.env.HIKICK_OPENAPI_PLATFORM_KEY || '',
      issuer: process.env.HIKICK_OPENAPI_ISSUER || '',
      permissions,
      email,
    });

    return client;
  }
}
