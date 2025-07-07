import { Client } from "minio";
import { Readable } from "stream";

/**
 * 连接 MinIO 的配置接口
 */
interface MinIOConfig {
  /**
   * 服务所在主机名
   * 必需
   */
  endPoint: string;
  /**
   * 服务端口
   * 可选
   * 默认 80 或 443
   */
  port: number;
  /**
   * 用户名
   * 必需
   * 默认: https://hub.docker.com/r/bitnami/minio, MINIO_ROOT_USER 变量
   */
  accessKey: string;
  /**
   * 密码
   * 必需
   * 默认: https://hub.docker.com/r/bitnami/minio, MINIO_ROOT_PASSWORD 变量
   */
  secretKey: string;
}

/**
 * 连接 MinIO 的默认配置
 * 可通过环境变量覆盖
 * 因为这些工具函数最终都会在服务端执行，即 Node.js 环境, 可以使用 process.env 获取环境变量
 * 环境变量在 .env 文件中定义, Next.js 会自动加载 .env 文件, https://nextjs.org/docs/app/guides/environment-variables#loading-environment-variables
 */
const defaultConfig: MinIOConfig = {
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT) : 9000,
  accessKey: process.env.MINIO_ACCESS_KEY || "minio",
  secretKey: process.env.MINIO_SECRET_KEY || "miniosecret",
};

/**
 * MinIO 实例使用的唯一 bucket 名称
 * 从环境变量中获取
 */
const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "default-bucket";

/**
 * MinIO 客户端实例
 */
let minioClient: Client | null = null;

/**
 * 获取 MinIO 客户端实例
 */
export function getMinIOClient(): Client {
  if (!minioClient) {
    // 使用单例模式, 避免重复创建客户端实例
    minioClient = new Client(defaultConfig);
  }
  return minioClient;
}

/**
 * 获取当前使用的 bucket 名称
 * @returns bucket 名称
 */
export function getBucketName(): string {
  return BUCKET_NAME;
}

/**
 * 验证文件类型是否支持
 * @param contentType 文件类型
 * @returns 是否支持
 */
export function isSupportedImageType(
  contentType: string
): contentType is SupportedImageType {
  return contentType === "image/jpeg" || contentType === "image/png";
}

/**
 * 支持的图片类型
 */
export type SupportedImageType = "image/jpeg" | "image/png";

/**
 * 文件上传选项
 */
export interface UploadOptions {
  fileName: string;
  metadata?: Record<string, string>;
  contentType?: SupportedImageType;
}

/**
 * 上传文件流到 MinIO
 * @param fileStream 文件流
 * @param options 上传选项
 * @returns 上传结果
 */
export async function uploadFileStream(
  /**
   * Readable: 文件可读流
   * Buffer: 二进制数据
   */
  fileStream: Readable | Buffer | string,
  options: UploadOptions
): Promise<{
  success: boolean;
  etag?: string;
  versionId?: string;
  error?: string;
}> {
  try {
    // 验证文件类型
    if (options.contentType && !isSupportedImageType(options.contentType)) {
      return {
        success: false,
        error: `不支持的文件类型: ${options.contentType}。只支持 image/jpeg 和 image/png`,
      };
    }

    /**
     * MinIO 客户端实例
     */
    const client = getMinIOClient();

    /**
     * bucket 是否存在
     */
    const bucketExists = await client.bucketExists(BUCKET_NAME);
    if (!bucketExists) {
      await client.makeBucket(BUCKET_NAME);
    }

    /**
     * 元数据
     */
    const metadata = {
      /**
       * 指定对象的 MIME 类型，影响浏览器如何解析内容
       * 只支持 image/jpeg 和 image/png 两种类型
       */
      "Content-Type": options.contentType || "image/jpeg",
      ...options.metadata,
    };

    // 上传文件
    const result = await client.putObject(
      BUCKET_NAME,
      options.fileName,
      fileStream,
      undefined, // size - MinIO 会自动检测
      metadata
    );

    return {
      success: true,
      etag: result.etag || undefined,
      versionId: result.versionId || undefined,
    };
  } catch (error) {
    console.error("MinIO 文件上传失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 获取文件下载 URL
 * @param objectName 对象名称
 * @param expiry 过期时间（秒），默认24小时
 * @returns 预签名 URL
 */
export async function getFileUrl(
  objectName: string,
  expiry: number = 24 * 60 * 60 // 默认24小时
): Promise<string> {
  try {
    const client = getMinIOClient();
    return await client.presignedGetObject(BUCKET_NAME, objectName, expiry);
  } catch (error) {
    console.error("获取文件 URL 失败:", error);
    throw error;
  }
}

/**
 * 检查文件是否存在
 * @param objectName 对象名称
 * @returns 文件是否存在
 */
export async function fileExists(objectName: string): Promise<boolean> {
  try {
    const client = getMinIOClient();
    await client.statObject(BUCKET_NAME, objectName);
    return true;
  } catch {
    return false;
  }
}

/**
 * 删除文件
 * @param objectName 对象名称
 * @returns 删除结果
 */
export async function deleteFile(
  objectName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getMinIOClient();
    await client.removeObject(BUCKET_NAME, objectName);
    return { success: true };
  } catch (error) {
    console.error("删除文件失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 列出 bucket 中的文件
 * @param prefix 文件名前缀过滤
 * @param recursive 是否递归列出子目录
 * @returns 文件列表
 */
export async function listFiles(
  prefix?: string,
  recursive: boolean = false
): Promise<{
  success: boolean;
  files?: Array<{
    name: string;
    size: number;
    lastModified: Date;
    etag: string;
  }>;
  error?: string;
}> {
  try {
    const client = getMinIOClient();
    const files: Array<{
      name: string;
      size: number;
      lastModified: Date;
      etag: string;
    }> = [];

    return new Promise((resolve) => {
      const stream = client.listObjects(BUCKET_NAME, prefix, recursive);

      stream.on("data", (obj) => {
        if (obj.name) {
          files.push({
            name: obj.name,
            size: obj.size || 0,
            lastModified: obj.lastModified || new Date(),
            etag: obj.etag || "",
          });
        }
      });

      stream.on("end", () => {
        resolve({ success: true, files });
      });

      stream.on("error", (error) => {
        console.error("列出文件失败:", error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        });
      });
    });
  } catch (error) {
    console.error("列出文件失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}
