import { PrismaPromise } from '@prisma/client';
import { Database } from '.';

const { prisma } = Database;

type PrismaPromiseResult = PrismaPromise<any>;
type PrismaPromiseOnce = Promise<() => PrismaPromiseResult>;

// This is $$$ transactions (first promise all then prisma transactions)
export async function $$$<T extends PrismaPromiseOnce>(
  functions: T | T[]
): Promise<
  T extends PrismaPromiseOnce ? PrismaPromiseResult : PrismaPromiseResult[]
> {
  return functions instanceof Array
    ? Promise.all(functions).then((transactions) =>
        prisma.$transaction(transactions.map((func) => func()))
      )
    : functions.then((func) => func());
}

// Prisma Query to $$$ transactions
export const $PQ =
  async <T>(func: PrismaPromise<T>): Promise<() => PrismaPromise<T>> =>
  () =>
    func;
