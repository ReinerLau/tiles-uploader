import { PrismaClient } from "@prisma/client";

/**
 * Prisma 客户端实例
 * 使用单例模式避免在开发环境中创建多个连接
 */
let prisma: PrismaClient;

/**
 * 获取 Prisma 客户端实例
 * @returns PrismaClient 实例
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

/**
 * 导出默认的 Prisma 实例
 */
export default getPrismaClient();
