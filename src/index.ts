import { Database, getRouter } from '.';

import serverless from 'serverless-http';

export * from './controllers';
export * from './middlewares';
export * from './routes';
export * from './tools';

Database.initPrisma();
const options = { basePath: '/v1/payments' };
export const handler = serverless(getRouter(), options);
